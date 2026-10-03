type Skill = { name: string; patterns: string[] };

// Short words like "go" and "r" are left out on purpose. They match normal English.
const CATALOG: Skill[] = [
  { name: "JavaScript", patterns: ["javascript"] },
  { name: "TypeScript", patterns: ["typescript"] },
  { name: "React", patterns: ["react", "react.js", "reactjs"] },
  { name: "Next.js", patterns: ["next.js", "nextjs"] },
  { name: "Vue", patterns: ["vue", "vue.js"] },
  { name: "Angular", patterns: ["angular"] },
  { name: "Node.js", patterns: ["node.js", "nodejs"] },
  { name: "Express", patterns: ["express.js", "expressjs"] },
  { name: "MongoDB", patterns: ["mongodb", "mongo db"] },
  { name: "Mongoose", patterns: ["mongoose"] },
  { name: "PostgreSQL", patterns: ["postgresql", "postgres"] },
  { name: "MySQL", patterns: ["mysql"] },
  { name: "Redis", patterns: ["redis"] },
  { name: "Docker", patterns: ["docker"] },
  { name: "Kubernetes", patterns: ["kubernetes", "k8s"] },
  { name: "AWS", patterns: ["aws", "amazon web services"] },
  { name: "GCP", patterns: ["gcp", "google cloud"] },
  { name: "Azure", patterns: ["azure"] },
  { name: "GraphQL", patterns: ["graphql"] },
  { name: "Python", patterns: ["python"] },
  { name: "Java", patterns: ["java"] },
  { name: "Golang", patterns: ["golang", "go lang"] },
  { name: "Rust", patterns: ["rust"] },
  { name: "C#", patterns: ["c#", "c sharp", "csharp"] },
  { name: "C++", patterns: ["c++"] },
  { name: "SQL", patterns: ["sql"] },
  { name: "HTML", patterns: ["html"] },
  { name: "CSS", patterns: ["css"] },
  { name: "Tailwind", patterns: ["tailwind"] },
  { name: "Git", patterns: ["git"] },
  { name: "Jest", patterns: ["jest"] },
  { name: "Vitest", patterns: ["vitest"] },
  { name: "Vite", patterns: ["vite"] },
  { name: "Zod", patterns: ["zod"] },
  { name: "REST", patterns: ["rest", "restful"] },
  { name: "JWT", patterns: ["jwt"] },
  { name: "Linux", patterns: ["linux"] },
  { name: "Socket.IO", patterns: ["socket.io", "socketio"] },
  { name: "Django", patterns: ["django"] },
  { name: "Flask", patterns: ["flask"] },
  { name: "Spring", patterns: ["spring boot", "spring"] },
  { name: "Ruby", patterns: ["ruby"] },
  { name: "Rails", patterns: ["ruby on rails", "rails"] },
  { name: "PHP", patterns: ["php"] },
  { name: "Laravel", patterns: ["laravel"] },
  { name: "Swift", patterns: ["swift"] },
  { name: "Kotlin", patterns: ["kotlin"] },
  { name: "Flutter", patterns: ["flutter"] },
  { name: "React Native", patterns: ["react native"] },
  { name: "Terraform", patterns: ["terraform"] },
  { name: "GitHub Actions", patterns: ["github actions"] },
  { name: "CI/CD", patterns: ["ci/cd", "cicd"] },
  { name: "Nginx", patterns: ["nginx"] },
  { name: "Elasticsearch", patterns: ["elasticsearch"] },
  { name: "Kafka", patterns: ["kafka"] },
  { name: "Prisma", patterns: ["prisma"] },
  { name: "Figma", patterns: ["figma"] },
  { name: "Redux", patterns: ["redux"] },
  { name: "TanStack Query", patterns: ["tanstack query", "react query"] },
];

const ALIASES: Record<string, string> = {
  reactjs: "react",
  react: "react",
  nodejs: "node",
  node: "node",
  nextjs: "next",
  postgres: "postgresql",
  postgresql: "postgresql",
  mongo: "mongodb",
  mongodb: "mongodb",
  k8s: "kubernetes",
  kubernetes: "kubernetes",
  golang: "go",
  go: "go",
  githubactions: "githubactions",
  cicd: "cicd",
  reactnative: "reactnative",
  tanstackquery: "tanstackquery",
  reactquery: "tanstackquery",
  socketio: "socketio",
  csharp: "csharp",
  cpp: "cpp",
  typescript: "typescript",
  javascript: "javascript",
  expressjs: "express",
  express: "express",
};

function squash(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9+#]/g, "");
}

export function skillKey(input: string) {
  const compact = squash(input).replace("c#", "csharp").replace("c++", "cpp");
  return ALIASES[compact] || compact;
}

function mentioned(text: string, pattern: string) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9+#])${escaped}([^a-z0-9+#]|$)`, "i").test(text);
}

export function findSkillsInText(text: string) {
  const found: string[] = [];
  for (const skill of CATALOG) {
    if (skill.patterns.some((pattern) => mentioned(text, pattern))) found.push(skill.name);
  }
  return found;
}

export function uniqueByKey(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const key = skillKey(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(value.trim());
  }
  return out;
}
