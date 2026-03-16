import test from "node:test";
import assert from "node:assert/strict";

import { buildAssetCatalogFromFiles, type AssetFileEntry } from "../lib/asset-catalog";

function createFile(name: string, url: string): AssetFileEntry {
  const extension = name.slice(name.lastIndexOf(".")).toLowerCase();
  const basename = name.slice(0, name.lastIndexOf("."));
  return {
    name,
    basename,
    extension,
    url,
  };
}

const cases = [
  {
    name: "player catalog matches uppercase JPG files case-insensitively",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [createFile("TyUrArA.JPG", "/assets/players/TyUrArA.JPG")],
        [],
      );
      assert.equal(catalog.players.urls.tyurara, "/assets/players/TyUrArA.JPG");
    },
  },
  {
    name: "player catalog preserves the original filename url",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [createFile("Nage.jpg", "/assets/players/Nage.jpg")],
        [],
      );
      assert.equal(catalog.players.choices[0]?.url, "/assets/players/Nage.jpg");
    },
  },
  {
    name: "player catalog prefers jpg over png for the same loose name",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [
          createFile("Tyurara.png", "/assets/players/Tyurara.png"),
          createFile("Tyurara.JPG", "/assets/players/Tyurara.JPG"),
        ],
        [],
      );
      assert.equal(catalog.players.urls.tyurara, "/assets/players/Tyurara.JPG");
    },
  },
  {
    name: "player catalog deduplicates repeated case variants",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [
          createFile("Tyurara.JPG", "/assets/players/Tyurara.JPG"),
          createFile("tyurara.jpg", "/assets/players/tyurara.jpg"),
        ],
        [],
      );
      assert.equal(catalog.players.choices.length, 1);
    },
  },
  {
    name: "player catalog keeps punctuation in option labels",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [createFile("Jack-O'.jpg", "/assets/players/Jack-O'.jpg")],
        [],
      );
      assert.equal(catalog.players.choices[0]?.label, "Jack-O'");
    },
  },
  {
    name: "character catalog normalizes official aliases",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [],
        [createFile("sol badguy.JPG", "/assets/characters/sol badguy.JPG")],
      );
      assert.equal(catalog.characters.choices[0]?.label, "Sol");
      assert.equal(catalog.characters.urls.sol, "/assets/characters/sol badguy.JPG");
    },
  },
  {
    name: "character catalog normalizes Bedman question-mark names",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [],
        [createFile("bedman.jpg", "/assets/characters/bedman.jpg")],
      );
      assert.equal(catalog.characters.choices[0]?.label, "Bedman?");
    },
  },
  {
    name: "catalog supports mixed player and character entries together",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [createFile("Leffen.jpg", "/assets/players/Leffen.jpg")],
        [createFile("queen dizzy.JPG", "/assets/characters/queen dizzy.JPG")],
      );
      assert.equal(catalog.players.urls.leffen, "/assets/players/Leffen.jpg");
      assert.equal(catalog.characters.urls.dizzy, "/assets/characters/queen dizzy.JPG");
    },
  },
  {
    name: "player catalog sorts choices by label ignoring case",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [
          createFile("zeta.jpg", "/assets/players/zeta.jpg"),
          createFile("Alpha.jpg", "/assets/players/Alpha.jpg"),
        ],
        [],
      );
      assert.deepEqual(catalog.players.choices.map((choice) => choice.label), ["Alpha", "zeta"]);
    },
  },
  {
    name: "character catalog handles Jack-O apostrophe filenames",
    run: () => {
      const catalog = buildAssetCatalogFromFiles(
        [],
        [createFile("jack-o.jpeg", "/assets/characters/jack-o.jpeg")],
      );
      assert.equal(catalog.characters.urls.jacko, "/assets/characters/jack-o.jpeg");
      assert.equal(catalog.characters.choices[0]?.label, "Jack-O'");
    },
  },
] as const;

for (const testCase of cases) {
  test(testCase.name, () => {
    testCase.run();
  });
}
