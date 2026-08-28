import test from "node:test";
import assert from "node:assert/strict";

import {
  initializeInviteLanding,
  invitationDeepLink,
  tokenFromHash,
} from "./invite.js";

const token = "0123456789abcdef".repeat(4);
const deepLink = `posbon://invite?token=${token}`;

type MockElement = {
  hidden: boolean;
  href?: string;
  textContent: string;
  removeAttribute(name: string): void;
};

function pageElements() {
  const elements = new Map<string, MockElement>();
  for (
    const id of [
      "invite-title",
      "invite-message",
      "invite-cta",
      "invite-note",
    ]
  ) {
    const element: MockElement = {
      hidden: id === "invite-cta" || id === "invite-note",
      textContent: "",
      removeAttribute(name: string) {
        if (name === "href") delete this.href;
      },
    };
    elements.set(id, element);
  }
  return elements;
}

function render(hash: string) {
  const elements = pageElements();
  const navigation: string[] = [];
  const pageDocument = {
    getElementById(id: string) {
      return elements.get(id) ?? null;
    },
  };
  const pageLocation = {
    hash,
    assign(value: string) {
      navigation.push(value);
    },
  };
  const scheduled: Array<() => void> = [];
  const result = initializeInviteLanding(
    pageDocument,
    pageLocation,
    (callback: () => void) => {
      scheduled.push(callback);
      return 1;
    },
  );
  for (const callback of scheduled) callback();
  return { elements, navigation, result };
}

test("valid 64-character fragment token produces the exact deep link", () => {
  assert.equal(tokenFromHash(`#token=${token}`), token);
  assert.equal(invitationDeepLink(token), deepLink);

  const rendered = render(`#token=${token}`);
  assert.equal(rendered.result, deepLink);
  assert.equal(rendered.elements.get("invite-cta")?.href, deepLink);
  assert.deepEqual(rendered.navigation, [deepLink]);
});

test("missing and invalid fragment tokens expose no deep link", () => {
  for (
    const hash of [
      "",
      "#token=short",
      `#token=${"g".repeat(64)}`,
      `#token=${token}&extra=value`,
      `?token=${token}`,
    ]
  ) {
    const rendered = render(hash);
    assert.equal(rendered.result, null, hash);
    assert.equal(rendered.elements.get("invite-cta")?.href, undefined, hash);
    assert.equal(rendered.elements.get("invite-cta")?.hidden, true, hash);
    assert.deepEqual(rendered.navigation, [], hash);
  }
});

test("static implementation never writes dynamic values through innerHTML", async () => {
  const source = await Deno.readTextFile(
    new URL("./invite.js", import.meta.url),
  );
  assert.equal(source.includes("innerHTML"), false);
  assert.match(source, /\.textContent\s*=/);
  assert.match(source, /cta\.href\s*=\s*deepLink/);
});

test("GitHub Pages configuration and security metadata are fixed", async () => {
  const cname = await Deno.readTextFile(new URL("./CNAME", import.meta.url));
  assert.equal(cname.replace(/\r?\n$/, ""), "join.posbon.workio.ca");
  assert.equal(cname.replace(/\r?\n$/, "").includes("\n"), false);

  const html = await Deno.readTextFile(
    new URL("./index.html", import.meta.url),
  );
  assert.match(html, /http-equiv="Content-Security-Policy"/);
  assert.match(html, /name="referrer" content="no-referrer"/);
  assert.match(html, /name="robots" content="noindex, nofollow, noarchive"/);
  assert.equal(html.includes("posbon://invite"), false);
  assert.equal(/<a[^>]+id="invite-cta"[^>]+href=/i.test(html), false);
});
