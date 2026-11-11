from datetime import date
from unittest import TestCase
from digest import articles, campaign, deliver


class DeliveryTests(TestCase):
    def setUp(self):
        self.posts = articles([
            dict(id="old", title="Uma", category="crónicas", date="2026-01-01"),
            dict(id="a/b", title="Limão & chá", category="crónicas", date="2026-03-01", content="**Olá!**"),
            dict(id="photo", title="Foto", category="fotografias", date="2026-04-01")])
        self.state = {"baseline": [], "sent": []}
        self.status = "draft"
        self.requests = []
        self.credits = 300

    def api(self, route, body=None):
        if route == "/emailCampaigns":
            return {"id": 42}
        if route.endswith("/sendNow"):
            self.assertEqual(self.state["pending"]["campaignId"], 42)
            self.requests.append(route)
            self.status = "queued"
            return
        if route == "/account":
            return {"plan": [{"type": "free", "creditsType": "sendLimit", "credits": self.credits}]}
        if route.startswith("/contacts/"):
            return {"totalSubscribers": 2}
        return {"status": self.status}

    def run_digest(self):
        deliver(self.state, lambda: None, self.api, self.posts, date.today(), 1, "editor@example.org")

    def test_edition(self):
        html = campaign(self.posts, date.today(), 1, "")["htmlContent"]
        self.assertIn("Limão &amp; chá", html)
        self.assertIn("Olá!", html)
        self.assertIn("id=a%2Fb", html)
        self.assertNotIn("Foto", html)
        self.assertLess(html.index("Limão"), html.index("Uma"))

    def test_catchup_retry_then_empty_week(self):
        self.run_digest()
        self.run_digest()
        self.status = "sent"
        self.run_digest()
        self.posts[0]["title"] = "Updated"
        self.run_digest()
        self.assertEqual(len(self.requests), 1)
        self.assertEqual(self.state["sent"], [{"ids": ["a/b", "old"], "campaignId": 42}])

    def test_baseline_and_capacity(self):
        self.state["baseline"] = ["old"]
        self.credits = 1
        with self.assertRaises(RuntimeError):
            self.run_digest()
        self.assertFalse(self.requests)
        self.assertEqual(self.state["pending"]["ids"], ["a/b"])
        self.credits = 300
        self.run_digest()
        self.assertEqual(len(self.requests), 1)
