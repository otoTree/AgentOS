import { getPublicTools } from "../src/app/agent/actions";

async function main() {
  try {
    console.log("Fetching public tools...");
    const tools = await getPublicTools();
    console.log(`Found ${tools.length} tools.`);
    tools.forEach(t => {
      console.log(`- ${t.name} (Project: ${t.projectName})`);
    });
  } catch (error) {
    console.error("Error fetching tools:", error);
  }
}

main();