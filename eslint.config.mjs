import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    files: ["lib/agent/**/*.{ts,tsx,js,mjs}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@/lib/db", message: "lib/agent must not use Prisma (INT-BOUNDARY-01)" },
            { name: "@prisma/client", message: "lib/agent must not use Prisma (INT-BOUNDARY-01)" },
          ],
          patterns: [
            {
              group: ["**/lib/db", "**/lib/db/**", "**/prisma/**", "**/@prisma/**"],
              message: "lib/agent must not use Prisma (INT-BOUNDARY-01)",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;