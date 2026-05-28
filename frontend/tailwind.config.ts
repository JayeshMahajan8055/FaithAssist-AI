import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./hooks/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17211b",
        parchment: "#f6efe2",
        vellum: "#fffaf1",
        moss: "#315b43",
        fern: "#6d8b67",
        wine: "#8c3346",
        gold: "#c79a3a",
        cloud: "#edf3ec",
        line: "#ded5c4"
      },
      boxShadow: {
        soft: "0 16px 45px rgba(23, 33, 27, 0.10)",
        premium: "0 24px 70px rgba(23, 33, 27, 0.16)",
        card: "0 10px 30px rgba(23, 33, 27, 0.08)"
      }
    }
  },
  plugins: [require("@tailwindcss/typography")]
};

export default config;
