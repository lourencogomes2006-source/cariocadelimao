"""Weekly Carioca Semanal delivery. Run from the application checkout."""
import argparse
from datetime import datetime
from html import escape
import json
import os
from pathlib import Path
import re
import subprocess
from urllib.parse import quote
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

ORIGIN = "https://cariocadelimao.vercel.app"
LISBON = ZoneInfo("Europe/Lisbon")


def request(url, body=None, key=None):
    headers = {"Accept": "application/json"}
    if key:
        headers["api-key"] = key
    if body is not None:
        headers["Content-Type"] = "application/json"
    req = Request(url, headers=headers, data=None if body is None else json.dumps(body).encode())
    with urlopen(req, timeout=30) as response:
        raw = response.read()
        return json.loads(raw) if raw else None


def articles(rows):
    if not isinstance(rows, list):
        raise ValueError("Unexpected posts response")
    posts = {}
    for row in rows:
        if row["category"] == "crónicas":
            post_id = row["id"]
            if not isinstance(post_id, str) or not post_id or not row["title"]:
                raise ValueError("Invalid article")
            posts[post_id] = row
    return sorted(posts.values(), key=lambda p: p.get("createdAt") or p["date"], reverse=True)


def campaign(posts, date, list_id, sender):
    subject = "Carioca Semanal · " + date.strftime("%d/%m/%Y")
    parts = ['<html lang="pt"><meta charset="utf-8"><body style="font:18px/1.6 Georgia,serif;max-width:640px;margin:auto">',
             "<h1>" + subject + "</h1>"]
    for post in posts:
        excerpt = (post.get("excerpt") or "").strip()
        if not excerpt:
            plain = re.sub(r"<[^>]*>|[*_`#]", "", post.get("content") or "")
            plain = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", " ".join(plain.split()))
            excerpt = plain if len(plain) <= 200 else plain[:200].rsplit(" ", 1)[0] + "…"
        link = ORIGIN + "/post.html?id=" + quote(post["id"], safe="")
        parts.append(f'<h2>{escape(post["title"])}</h2><p>{escape(excerpt)}</p><p><a href="{link}">Ler a crónica</a></p>')
    parts.append('<p><a href="{{ unsubscribe }}">Cancelar a inscrição</a></p></body></html>')
    return dict(name=subject, subject=subject, sender={"email": sender, "name": "Carioca de Limão"},
                recipients={"listIds": [list_id]}, htmlContent="".join(parts))


def save(path, state):
    path.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
    for args in (["add", path.name], ["commit", "-m", "Update newsletter delivery state"],
                 ["push", "origin", "HEAD:refs/heads/newsletter-state"]):
        subprocess.run(["git", "-C", str(path.parent), *args], check=True)


def check_capacity(api, target):
    account = api("/account")
    credits = next((p["credits"] for p in account["plan"] if p["type"] == "free" and p.get("creditsType") == "sendLimit"), None)
    count = api(f"/contacts/lists/{target}")["totalSubscribers"]
    if not count or credits is None or count > min(300, credits):
        raise RuntimeError("Campaign held. Check list size and available free sending credits.")


def deliver(state, persist, api, posts, today, list_id, sender):
    pending = state.get("pending")
    if not pending:
        seen = set(state["baseline"])
        for edition in state["sent"]:
            seen.update(edition["ids"])
        new = [p for p in posts if p["id"] not in seen]
        if not new:
            return
        pending = {"ids": [p["id"] for p in new], "payload": campaign(new, today, list_id, sender)}
        state["pending"] = pending
        persist()
    if "campaignId" not in pending:
        pending["campaignId"] = api("/emailCampaigns", pending["payload"])["id"]
        persist()
    endpoint = "/emailCampaigns/" + str(pending["campaignId"])
    status = api(endpoint)["status"]
    if status == "sent":
        state["sent"].append({"ids": pending["ids"], "campaignId": pending["campaignId"]})
        del state["pending"]
        persist()
        return
    if status in ("queued", "inProcess", "inProgress"):
        print("Awaiting Brevo delivery confirmation.")
        return
    if status != "draft" or pending.get("requested"):
        raise RuntimeError("Inspect the existing campaign in Brevo before retrying delivery.")
    check_capacity(api, pending["payload"]["recipients"]["listIds"][0])
    pending["requested"] = True
    persist()
    api(endpoint + "/sendNow", {})
    if api(endpoint)["status"] == "sent":
        deliver(state, persist, api, posts, today, list_id, sender)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["baseline", "deliver", "preview", "test", "reconcile"])
    parser.add_argument("--state", type=Path)
    args = parser.parse_args()
    today = datetime.now(LISBON).date()
    posts = articles(request(ORIGIN + "/api/posts?category=cr%C3%B3nicas"))
    if args.mode == "preview":
        print(campaign(posts[:2], today, 0, "")["htmlContent"])
        return
    path = args.state
    if args.mode == "baseline":
        if path.exists():
            raise RuntimeError("Baseline already exists")
        save(path, {"baseline": [p["id"] for p in posts], "sent": []})
        return
    def api(route, body=None):
        return request("https://api.brevo.com/v3" + route, body, os.environ["BREVO_API_KEY"])
    sender = os.environ["BREVO_SENDER"]
    if args.mode == "test":
        test_list = int(os.environ["BREVO_TEST_LIST_ID"])
        if test_list == int(os.environ["BREVO_LIST_ID"]) or not posts:
            raise ValueError("A distinct test list and sample articles are required")
        check_capacity(api, test_list)
        payload = campaign(posts[:2], today, test_list, sender)
        draft = api("/emailCampaigns", payload)
        api(f'/emailCampaigns/{draft["id"]}/sendNow', {})
        return
    state = json.loads(path.read_text())
    if args.mode == "reconcile" and not state.get("pending", {}).get("requested"):
        return
    deliver(state, lambda: save(path, state), api, posts, today, int(os.environ["BREVO_LIST_ID"]), sender)


if __name__ == "__main__":
    main()
