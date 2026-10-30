# Attribution

**3D anatomy (`assets/anatomy.glb`)** — derived from *BodyParts3D*, © The Database Center for Life Science (DBCLS),
licensed under Creative Commons Attribution-ShareAlike 2.1 Japan
(<https://creativecommons.org/licenses/by-sa/2.1/jp/>). Source: <https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html>.

Changes: selected skin, skeleton, 30 large muscles, lungs, kidneys, heart and liver; units converted to metres; reoriented;
simplified by vertex clustering; quantised and merged into one glTF binary by `tools/build-anatomy.mjs`.
The derived model is shared under the same CC BY-SA 2.1 Japan terms. Application code is separate.

**Teaching photographs (`assets/edu/`)** — downloaded from Wikimedia Commons by `tools/fetch-edu-images.mjs`, resized for the web, and
filtered to CC0, public domain, CC BY and CC BY-SA files only. Author, licence and source page for every image are in
`assets/edu/credits.json` and printed under each image in the app. Images remain under their own licences (CC BY-SA images
must be shared under the same licence).

Additional figure: Wang J, Wang M, Qi Q, Wu Z, Wen J. *Scientific Reports* 2022;12:21372, Figure 1, CC BY 4.0 (<https://doi.org/10.1038/s41598-022-25958-w>), converted to JPEG and resized.

Further figures were taken from open-access articles (CC BY, licence checked in each article's XML via Europe PMC) and are listed in
`tools/external-figures.json` and `assets/edu/credits.json` with author, journal, DOI and licence. They were converted to JPEG and resized only.
Figures whose legends credit third-party material (e.g. the ICAP committee) were excluded.

Gemini-suggested leads were verified independently before use; several were rejected (alopecia areata photos for lupus alopecia, a mumps photograph for Sjögren parotid swelling, a flowchart presented as microscopy images).
