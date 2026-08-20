import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { cleanDescription } from '../src/services/job.processor';

const samples = [
  `
    <main>
      <h2>About the role</h2>
      <p>We are looking for a backend engineer to build TypeScript APIs,
      improve PostgreSQL queries, write automated tests, and collaborate with
      product managers.</p>
      <h3>Requirements</h3>
      <ul><li>Node.js</li><li>PostgreSQL</li><li>Docker</li></ul>
    </main>
  `,
  `
    Close Home General Jobs Companies Post a job Sign in Log in Menu.
    Similar jobs Related jobs Recommended jobs.
    We are hiring a software engineer to design services, review code, and
    improve system reliability for a distributed remote team.
  `,
  `
    Join or sign in to find your next job. Email or phone. Forgot password?
    New to LinkedIn? Join now. By clicking continue to join or sign in, you
    agree to the User Agreement, Privacy Policy, and Cookie Policy.
  `,
  `
    About this role\u00a0\u00a0
    You will build APIs, maintain data pipelines, investigate failures, and
    document engineering decisions.\u200b

    What you will bring
    TypeScript, Node.js, SQL, testing, and clear written communication.
  `,
];

const iterationsPerRound = 25_000;
const measuredRounds = 8;

function runRound(iterations: number): { elapsedMs: number; checksum: number } {
  let checksum = 0;
  const start = performance.now();

  for (let index = 0; index < iterations; index += 1) {
    checksum += cleanDescription(samples[index % samples.length]).length;
  }

  return {
    elapsedMs: performance.now() - start,
    checksum,
  };
}

// Warm up the JIT before collecting timings.
runRound(10_000);

const rounds = Array.from({ length: measuredRounds }, () =>
  runRound(iterationsPerRound)
);
const sortedMs = rounds.map((round) => round.elapsedMs).sort((a, b) => a - b);
const medianMs =
  (sortedMs[measuredRounds / 2 - 1] + sortedMs[measuredRounds / 2]) / 2;
const operationsPerSecond = Math.round(
  iterationsPerRound / (medianMs / 1_000)
);

console.log(
  JSON.stringify(
    {
      benchmark: 'cleanDescription',
      measuredAt: new Date().toISOString(),
      runtime: process.version,
      platform: `${process.platform}/${process.arch}`,
      cpu: os.cpus()[0]?.model ?? 'unknown',
      samples: samples.length,
      iterationsPerRound,
      measuredRounds,
      medianRoundMs: Number(medianMs.toFixed(2)),
      operationsPerSecond,
      checksum: rounds[0].checksum,
      scope:
        'CPU-only description cleanup; excludes network, browser, database, and cache latency',
    },
    null,
    2
  )
);
