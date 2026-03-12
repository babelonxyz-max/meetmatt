import "dotenv/config";

import { readFile } from "node:fs/promises";
import { provisionPlanckHqBotFleet } from "../lib/planck-hq-bot-fleet";

type SeatCredentials = Record<
  string,
  {
    botToken?: string | null;
    session?: string | null;
    externalTelegramUsername?: string | null;
    externalTelegramUserId?: string | null;
    externalPhone?: string | null;
    runtimeLabel?: string | null;
    displayName?: string | null;
    status?: string | null;
  }
>;

function readFlag(name: string): string | null {
  const index = process.argv.indexOf(name);
  if (index < 0 || index + 1 >= process.argv.length) {
    return null;
  }
  return process.argv[index + 1] ?? null;
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function printHelp() {
  console.log("Usage: pnpm seed:planck-hq-bots --userId <userId> [options]");
  console.log("");
  console.log("Options:");
  console.log("  --workspaceId <workspaceId>     Seed into an existing workspace");
  console.log("  --credentials <path>            JSON file keyed by seatId, bindingId, employeeId, or name");
  console.log("  --identityStatus <status>       pending | active | suspended | revoked | error");
  console.log("  --ownershipType <type>          customer_owned | meetmatt_managed");
  console.log("");
  console.log("Credential file example:");
  console.log(
    JSON.stringify(
      {
        "seat.planck.hq.cro.george": {
          externalTelegramUsername: "george_planck_bot",
          botToken: "123456:ABCDEF",
        },
      },
      null,
      2,
    ),
  );
}

async function loadCredentials(pathname: string | null): Promise<SeatCredentials | null> {
  if (!pathname) {
    return null;
  }

  const raw = await readFile(pathname, "utf8");
  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    throw new Error("Credentials JSON must be an object keyed by seat reference");
  }

  return parsed as SeatCredentials;
}

async function main() {
  if (hasFlag("--help")) {
    printHelp();
    return;
  }

  const userId = readFlag("--userId");
  if (!userId) {
    printHelp();
    throw new Error("--userId is required");
  }

  const result = await provisionPlanckHqBotFleet({
    userId,
    workspaceId: readFlag("--workspaceId"),
    identityStatus: readFlag("--identityStatus"),
    identityOwnershipType: readFlag("--ownershipType"),
    seatCredentials: await loadCredentials(readFlag("--credentials")),
  });

  console.log(
    JSON.stringify(
      {
        workspaceId: result.workspaceId,
        totalSeats: result.totalSeats,
        createdAgents: result.createdAgents,
        createdIdentities: result.createdIdentities,
        updatedIdentities: result.updatedIdentities,
        seats: result.seats.map((seat) => ({
          seatId: seat.seatId,
          displayName: seat.displayName,
          title: seat.title,
          agentSlug: seat.agentSlug,
          telegramIdentityId: seat.telegramIdentityId,
          externalTelegramUsername: seat.externalTelegramUsername,
          hasCredentials: seat.hasCredentials,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error("[seed-planck-hq-bot-fleet] Failed:", error);
  process.exit(1);
});
