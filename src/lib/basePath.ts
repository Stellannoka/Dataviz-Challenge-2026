// next.config.ts applies basePath in BOTH dev and production, so asset()
// must apply it in both too — otherwise dev fetches miss the data files.
export const BASE_PATH = "/Dataviz-Challenge-2026";
export const asset = (path: string) => `${BASE_PATH}${path}`;