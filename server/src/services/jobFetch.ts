// Fetches a job posting URL and strips it down to readable text.
// Best-effort only — some sites block server-side fetches or render via JS,
// in which case the caller should fall back to asking the user to paste the text.
export async function fetchJobDescriptionFromUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    },
  });

  if (!res.ok) {
    throw new Error(`Fetching job URL failed with status ${res.status}`);
  }

  const html = await res.text();

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length < 200) {
    throw new Error(
      "Fetched page had very little text — it may be JS-rendered. Paste the job description text directly instead."
    );
  }

  return text;
}
