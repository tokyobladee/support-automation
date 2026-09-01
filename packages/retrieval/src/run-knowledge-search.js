import { KeywordKnowledgeRetriever } from "./keyword-knowledge-retriever.js";
import { buildSeededKnowledgeRepository } from "./seeded-knowledge-repository.js";

const request = parseArguments(process.argv.slice(2));
const repository = await buildSeededKnowledgeRepository();
const retriever = new KeywordKnowledgeRetriever({ repository });
const result = await retriever.search(request);

process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);

if (result.citations.length === 0) {
  process.exitCode = 1;
}

function parseArguments(args) {
  const options = {
    query: args.filter((arg) => !arg.startsWith("--")).join(" "),
    tags: []
  };

  for (const arg of args.filter((item) => item.startsWith("--"))) {
    const [name, rawValue = ""] = arg.slice(2).split("=");

    if (name === "topK") {
      options.topK = Number(rawValue);
    }

    if (name === "language") {
      options.language = rawValue;
    }

    if (name === "tag") {
      options.tags.push(rawValue);
    }
  }

  return options;
}
