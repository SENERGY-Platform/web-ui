import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default [{
    ignores: ["projects/**/*"],
}, ...compat.extends(
    "plugin:@angular-eslint/recommended",
    "plugin:@typescript-eslint/recommended",
    "prettier"
).map(config => ({
    ...config,
    files: ["**/*.ts"],
})), {
    files: ["**/*.ts"],

    languageOptions: {
        ecmaVersion: 5,
        sourceType: "script",

        parserOptions: {
            project: ["tsconfig.app.json", "tsconfig.spec.json", "e2e/tsconfig.json"],
            createDefaultProgram: true,
        },
    },

    rules: {
        "@typescript-eslint/consistent-type-definitions": "error",
        "@typescript-eslint/dot-notation": "off",
        "@typescript-eslint/no-explicit-any": "off",

        "@typescript-eslint/explicit-member-accessibility": ["off", {
            accessibility: "explicit",
        }],

        "@angular-eslint/component-class-suffix": ["error", {
            suffixes: ["Directive", "Component", "View"],
        }],

        "@angular-eslint/component-selector": ["error", {
            type: "string",
            prefix: "senergy",
            style: "kebab-case",
        }],

        "brace-style": ["error", "1tbs"],
        "dot-notation": "off",
        "id-blacklist": "off",
        "id-match": "off",
        indent: "off",
        "no-empty-function": "off",
        "no-shadow": "error",
        "no-underscore-dangle": "off",
        "no-unused-expressions": "error",
        quotes: [2, "single", "avoid-escape"],
        semi: "error",

        "@typescript-eslint/naming-convention": ["warn", {
            selector: "variableLike",
            format: ["camelCase", "UPPER_CASE"],
            leadingUnderscore: "allow",
        }],

        "spaced-comment": ["error", "always", {
            exceptions: ["*"],
        }],

        "@typescript-eslint/member-ordering": "off",
        "prefer-arrow/prefer-arrow-functions": "off",
        "max-len": "off",
        "@typescript-eslint/no-unused-expressions": "off",
        "@typescript-eslint/prefer-for-of": "off",
        "jsdoc/newline-after-description": "off",
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
              "args": "all",
              "argsIgnorePattern": "^_",
              "caughtErrors": "all",
              "caughtErrorsIgnorePattern": "^_",
              "destructuredArrayIgnorePattern": "^_",
              "varsIgnorePattern": "^_",
              "ignoreRestSiblings": true
            }
          ]
    },
}, ...compat.extends("plugin:@angular-eslint/template/recommended").map(config => ({
    ...config,
    files: ["**/*.html"],
})), {
    files: ["**/*.html"],
    rules: {
        "@angular-eslint/template/eqeqeq": "off",
    },
}];