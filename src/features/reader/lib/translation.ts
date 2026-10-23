export const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "sq", label: "Albanian" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "it", label: "Italian" },
  { code: "pt", label: "Portuguese" },
  { code: "tr", label: "Turkish" },
  { code: "ja", label: "Japanese" },
];

type BrowserTranslator = { translate(text: string): Promise<string> };
type BrowserTranslatorConstructor = {
  availability(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<string>;
  create(options: {
    sourceLanguage: string;
    targetLanguage: string;
  }): Promise<BrowserTranslator>;
};

/** Translation happens only when the user explicitly requests it. */
export async function translateText(
  text: string,
  source: string,
  target: string,
): Promise<{ value: string; provider: string }> {
  if (source === target) return { value: text, provider: "Original text" };

  const localTranslator = (
    window as Window & { Translator?: BrowserTranslatorConstructor }
  ).Translator;
  if (localTranslator) {
    try {
      const availability = await localTranslator.availability({
        sourceLanguage: source,
        targetLanguage: target,
      });
      if (availability !== "unavailable") {
        const translator = await localTranslator.create({
          sourceLanguage: source,
          targetLanguage: target,
        });
        const result = await translator.translate(text);
        return { value: result, provider: "On-device browser translation" };
      }
    } catch {
      // The experimental browser API may be missing models or unsupported for this pair.
    }
  }

  // MyMemory's anonymous endpoint is free but rate-limited and not private.
  // Its documented maximum is 500 bytes per request.
  if (new TextEncoder().encode(text).length > 500) {
    throw new Error(
      "Select a shorter passage (500 bytes maximum) for free translation.",
    );
  }
  const url = new URL("https://api.mymemory.translated.net/get");
  url.searchParams.set("q", text);
  url.searchParams.set("langpair", `${source}|${target}`);
  const response = await fetch(url.toString());
  if (!response.ok)
    throw new Error("The translation service is currently unavailable.");
  const data: {
    responseStatus?: number | string;
    responseData?: { translatedText?: string };
    responseDetails?: string;
  } = await response.json();
  if (
    Number(data.responseStatus) !== 200 ||
    !data.responseData?.translatedText
  ) {
    throw new Error(
      data.responseDetails ||
        "Translation quota reached or language pair unsupported.",
    );
  }
  return {
    value: data.responseData.translatedText,
    provider: "MyMemory (public API)",
  };
}
