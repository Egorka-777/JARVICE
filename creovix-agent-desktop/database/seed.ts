import { appDataDir, join } from "@tauri-apps/api/path";
import { mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { createScenario, createStep, getAllScenarios } from "./db";

export async function seedBingTestScenario(): Promise<{
  scenarioId: number;
  csvPath: string;
}> {
  const existing = (await getAllScenarios()).find((s) => s.name === "Bing search test");
  if (existing) {
    return { scenarioId: existing.id, csvPath: existing.dataFilePath };
  }

  const dataDir = await appDataDir();
  const sampleDir = await join(dataDir, "sample-data");
  await mkdir(sampleDir, { recursive: true });
  const csvPath = await join(sampleDir, "bing-test.csv");
  await writeTextFile(
    csvPath,
    "ID,SiteUrl,LinkToInsert,TextToInsert,Quantity,Status,Comment\n1,https://www.bing.com,https://example.com/video-test,Проверка Creovix Agent Desktop,1,pending,\n",
  );

  const scenario = await createScenario("Bing search test", csvPath);

  const steps: Array<[string, string, string, boolean]> = [
    ["open_url", "Open Bing", '{"urlTemplate":"%SiteUrl%"}', false],
    [
      "fill_field",
      "Fill search box",
      '{"selector":"textarea#sb_form_q, input[name=\\"q\\"]","valueTemplate":"%LinkToInsert% %TextToInsert%"}',
      false,
    ],
    [
      "confirm",
      "Confirm before submit",
      '{"messageTemplate":"Проверь поисковый запрос перед Enter: %LinkToInsert% %TextToInsert%"}',
      true,
    ],
    [
      "click",
      "Press Enter in search",
      '{"selector":"textarea#sb_form_q, input[name=\\"q\\"]","pressKey":"Enter"}',
      true,
    ],
    ["write_status", "Mark row done", '{"status":"done"}', false],
  ];

  for (let i = 0; i < steps.length; i++) {
    const [type, label, configJson, requiresConfirmation] = steps[i];
    await createStep(
      scenario.id,
      i,
      type,
      label,
      configJson,
      requiresConfirmation,
    );
  }

  return { scenarioId: scenario.id, csvPath };
}
