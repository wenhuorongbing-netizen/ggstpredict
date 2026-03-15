import { promises as fs } from "fs";
import path from "path";
import DocsClient from "./DocsClient";

export default async function DocsPage() {
  const readMarkdown = async (filename: string) => {
    try {
      const filePath = path.join(process.cwd(), filename);
      return await fs.readFile(filePath, "utf-8");
    } catch (err) {
      console.error(`Failed to read ${filename}`, err);
      return `# Error\nCould not load **${filename}**.`;
    }
  };

  const userManual = await readMarkdown("USER_MANUAL.md");
  const adminManual = await readMarkdown("ADMIN_MANUAL.md");
  const deploymentGuide = await readMarkdown("DEPLOYMENT.md");

  return (
    <DocsClient
      userManual={userManual}
      adminManual={adminManual}
      deploymentGuide={deploymentGuide}
    />
  );
}
