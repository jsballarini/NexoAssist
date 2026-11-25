import { beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { deleteTicketsByTitlePrefix } from "../support/cleanup";
import { findAnaUserId, runEvalTurn } from "./helpers";
import { INTENT_VARIATIONS } from "./variations";

/**
 * EVAL-VAR (G2-QA-01): cada intenção é exercitada com várias formulações e validada
 * pelo comportamento (ações/regras/blocos), não pelo texto da resposta.
 */
describe("EVAL-VAR: variações de frase por intenção", () => {
  let anaId: string;
  let foreign: { publicId: string; title: string };

  beforeAll(async () => {
    // Evita candidato a duplicado por sobra de execuções anteriores (incidente de e-mail).
    await deleteTicketsByTitlePrefix("ana.souza@nexo.com.br", "E-mail corporativo indisponível");
    anaId = await findAnaUserId();
    foreign = await prisma.ticket.findFirstOrThrow({
      where: { requesterId: { not: anaId } },
      select: { publicId: true, title: true },
    });
  });

  for (const variation of INTENT_VARIATIONS) {
    describe(variation.intent, () => {
      it.each(variation.phrases)("%s", async (phrase) => {
        const text = phrase.replace("{foreign}", foreign.publicId);
        const result = await runEvalTurn(text, anaId);
        expect(variation.check(result, { foreignTitle: foreign.title })).toBeNull();
      });
    });
  }
});

