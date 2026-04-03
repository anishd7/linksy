"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { createGame } from "@/lib/api";

const COLORS = [
  { key: "yellow", label: "Yellow", color: "#F9DF6D" },
  { key: "green", label: "Green", color: "#A0C35A" },
  { key: "blue", label: "Blue", color: "#B0C4EF" },
  { key: "purple", label: "Purple", color: "#BA81C5" },
] as const;

type ColorKey = (typeof COLORS)[number]["key"];

interface FormData {
  categories: Record<ColorKey, string>;
  words: Record<ColorKey, [string, string, string, string]>;
}

function emptyForm(): FormData {
  return {
    categories: { yellow: "", green: "", blue: "", purple: "" },
    words: {
      yellow: ["", "", "", ""],
      green: ["", "", "", ""],
      blue: ["", "", "", ""],
      purple: ["", "", "", ""],
    },
  };
}

export function CreateGameForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ gameId: string; url: string } | null>(
    null
  );

  function setCategory(color: ColorKey, value: string) {
    setForm((f) => ({
      ...f,
      categories: { ...f.categories, [color]: value },
    }));
  }

  function setWord(color: ColorKey, index: number, value: string) {
    setForm((f) => {
      const words = [...f.words[color]] as [string, string, string, string];
      words[index] = value;
      return { ...f, words: { ...f.words, [color]: words } };
    });
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    const allWords: string[] = [];

    for (const c of COLORS) {
      const catName = form.categories[c.key].trim();
      if (!catName) {
        newErrors[`${c.key}.category`] = "Category name is required";
      } else if (catName.length > 40) {
        newErrors[`${c.key}.category`] = "Max 40 characters";
      }

      for (let i = 0; i < 4; i++) {
        const word = form.words[c.key][i].trim();
        if (!word) {
          newErrors[`${c.key}.word.${i}`] = "Required";
        } else if (word.length > 20) {
          newErrors[`${c.key}.word.${i}`] = "Max 20 characters";
        } else {
          allWords.push(word.toLowerCase());
        }
      }
    }

    // Check uniqueness
    const seen = new Set<string>();
    for (const word of allWords) {
      if (seen.has(word)) {
        newErrors["duplicate"] = `Duplicate word: "${word}"`;
      }
      seen.add(word);
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      const first = Object.values(newErrors)[0];
      toast.error(first);
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);

    try {
      const gameData = {
        yellow: {
          category: form.categories.yellow.trim(),
          words: form.words.yellow.map((w) => w.trim()),
        },
        green: {
          category: form.categories.green.trim(),
          words: form.words.green.map((w) => w.trim()),
        },
        blue: {
          category: form.categories.blue.trim(),
          words: form.words.blue.map((w) => w.trim()),
        },
        purple: {
          category: form.categories.purple.trim(),
          words: form.words.purple.map((w) => w.trim()),
        },
      };

      const res = await createGame(gameData);
      setResult(res);
      toast.success("Game created!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create game");
    } finally {
      setLoading(false);
    }
  }

  function handleCopyLink() {
    if (!result) return;
    navigator.clipboard.writeText(result.url).then(() => {
      toast.success("Link copied to clipboard!");
    });
  }

  if (result) {
    return (
      <Card className="w-full max-w-2xl mx-auto shadow-sm bg-white">
        <CardContent className="flex flex-col items-center gap-5 py-10 px-6">
          <div className="w-12 h-12 rounded-full bg-[#A0C35A] flex items-center justify-center">
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="font-heading text-2xl text-[#1A1A1A]">
            Puzzle Created!
          </h2>
          <div className="w-full bg-[#EFEBE4] rounded-lg px-4 py-3 text-center">
            <p className="text-sm text-[#6B6B6B] mb-1">Share this link:</p>
            <p className="font-medium text-[#1A1A1A] break-all">{result.url}</p>
          </div>
          <div className="flex gap-3 w-full">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="flex-1"
            >
              Copy Link
            </Button>
            <Button
              onClick={() => router.push(`/game/${result.gameId}`)}
              className="flex-1 bg-[#1A1A1A] text-white hover:bg-[#333]"
            >
              Play
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-sm bg-white">
      <CardContent className="py-6 px-6">
        <div className="space-y-0">
          {COLORS.map((c, idx) => (
            <div key={c.key}>
              {idx > 0 && <Separator className="my-5" />}
              <div className="flex items-start gap-3">
                <div
                  className="w-2 h-full min-h-[80px] rounded-full shrink-0 mt-1"
                  style={{ backgroundColor: c.color }}
                />
                <div className="flex-1 space-y-3">
                  <Input
                    placeholder="Category name"
                    data-testid={`category-${c.key}`}
                    value={form.categories[c.key]}
                    onChange={(e) => setCategory(c.key, e.target.value)}
                    className={`font-medium ${
                      errors[`${c.key}.category`]
                        ? "border-[#E74C3C] focus-visible:ring-[#E74C3C]"
                        : ""
                    }`}
                  />
                  {errors[`${c.key}.category`] && (
                    <p className="text-xs text-[#E74C3C]">
                      {errors[`${c.key}.category`]}
                    </p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i}>
                        <Input
                          placeholder={`Word ${i + 1}`}
                          data-testid={`word-${c.key}-${i}`}
                          value={form.words[c.key][i]}
                          onChange={(e) => setWord(c.key, i, e.target.value)}
                          className={
                            errors[`${c.key}.word.${i}`]
                              ? "border-[#E74C3C] focus-visible:ring-[#E74C3C]"
                              : ""
                          }
                        />
                        {errors[`${c.key}.word.${i}`] && (
                          <p className="text-xs text-[#E74C3C] mt-1">
                            {errors[`${c.key}.word.${i}`]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {errors["duplicate"] && (
          <p className="text-sm text-[#E74C3C] text-center mt-4">
            {errors["duplicate"]}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 bg-[#1A1A1A] text-white hover:bg-[#333] h-12 text-base font-semibold"
        >
          {loading ? "Creating..." : "Create Game"}
        </Button>
      </CardContent>
    </Card>
  );
}
