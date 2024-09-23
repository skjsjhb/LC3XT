import i18next from "i18next";
import enUS from "./en-US";
import zhCN from "./zh-CN";

export async function i18nInit(lang = "") {
    const lng = lang || Intl.DateTimeFormat().resolvedOptions().locale;

    await i18next.init({
        lng,
        resources: {
            "en-US": enUS,
            "zh-CN": zhCN,
        },
        fallbackLng: "en-US",
        interpolation: {
            escapeValue: false,
        },
    });
}
