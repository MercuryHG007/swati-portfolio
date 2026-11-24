// RFC 9116. The Expires date must stay in the future, so update it before it passes.
const SECURITY_TXT = [
  "Contact: mailto:hello@artistswatigarg.com",
  "Expires: 2027-11-18T00:00:00.000Z",
  "Preferred-Languages: en",
  "",
].join("\n");

export function GET() {
  return new Response(SECURITY_TXT, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
