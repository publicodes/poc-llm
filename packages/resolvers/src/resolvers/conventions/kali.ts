/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable arrow-body-style */
/* eslint-disable no-await-in-loop */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */

//import fs from "node:fs/promises";

import fuzzysort from "fuzzysort";
// import {
//   VectorStoreIndex,
//   serviceContextFromDefaults,
//   storageContextFromDefaults,
//   Document,
//   VectorIndexRetriever,
// } from "llamaindex";

import kaliData from "./kali-data.json";

import { z } from "zod";
import { log } from "../../utils";

export const RechercheConventionParameters = z.object({
  name: z.string().describe("Nom de la convention collective ou du métier"),
});

// const getConventionsIndex = async (): Promise<VectorStoreIndex> => {
//   //const PERSIST_PATH = "./persist-data";
//   let exist = false;
//   // try {
//   //   await fs.access(PERSIST_PATH);
//   //   exist = true;
//   // } catch (error) {
//   //   //pass
//   // }

//   const serviceContext = serviceContextFromDefaults();
//   const storageContext = await storageContextFromDefaults({
//     //persistDir: PERSIST_PATH,
//   });
//   let index;
//   if (exist) {
//     index = await VectorStoreIndex.init({
//       serviceContext,
//       storageContext,
//     });
//   } else {
//     const documents = kaliData.map(
//       (convention: Convention) =>
//         new Document({
//           text: JSON.stringify({
//             idcc: convention.idcc,
//             shortTitle: convention.shortTitle,
//             title: convention.title,
//             synonymes: convention.synonymes,
//           }),
//           id_: convention.idcc.toString(),
//         })
//     );
//     // Split text and create embeddings. Store them in a VectorStoreIndex
//     console.log(`Store ${documents.length} documents...`);
//     index = await VectorStoreIndex.fromDocuments(documents, {
//       storageContext,
//     });
//     console.log(`Done`);
//   }
//   return index;
// };

// type Convention = {
//   idcc: number;
//   title: string;
//   shortTitle: string;
//   synonymes?: string[];
// };

// const getAllDocuments = async <T>(
//   retriever: VectorIndexRetriever
// ): Promise<T[]> => {
//   const allNodes = await retriever.index.docStore.getAllRefDocInfo();
//   return (
//     await Promise.all(
//       Object.entries(allNodes || {}).map(async ([key, { nodeIds }]) => {
//         //   console.log(key, nodeIds);
//         if (nodeIds.length) {
//           const nodeId = nodeIds[0];
//           if (nodeId) {
//             const doc = await retriever.index.docStore.getDocument(
//               nodeId,
//               false
//             );
//             return {
//               //@ts-ignore
//               ...JSON.parse(doc.text),
//               id_: nodeId,
//             };
//           }
//         }
//       })
//     )
//   ).filter(Boolean);
// };

type ConventionData = {
  title: string;
  shortTitle: string;
  idcc: number;
  synonymes?: string[];
};

const getConventionsTextSearch = (
  text: string,
  conventions: ConventionData[]
) => {
  const conventionsTexts = conventions.map((convention) => ({
    title: `${convention.title} ${
      (convention.synonymes && convention.synonymes.join(" ")) || ""
    } ${convention.idcc}`,
    idcc: convention.idcc,
  }));
  const fuzzyResults = fuzzysort
    .go<{ title: string; idcc: number }>(text, conventionsTexts, {
      keys: ["title", "idcc"],
      limit: 3,
      //threshold: -1500,
    })
    .map((res) => ({ ...res.obj, score: res.score }));
  return fuzzyResults;
};

//const conventionResultSchema = z.custom<ConventionData>();

// makes an hybrid (fuzzy + vector) search on conventions index
export const pickConventions = async (text: string) => {
  // const conventionsVectorIndex = await getConventionsIndex();
  // const conventionsRetriever = conventionsVectorIndex.asRetriever();

  // const conventions = await getAllDocuments<ConventionData>(
  //   conventionsRetriever
  // );

  // const vectorResults = (await conventionsRetriever.retrieve(text)).map(
  //   (vector) => {
  //     const result = conventionResultSchema.parse(
  //       //@ts-ignore
  //       JSON.parse(vector.node.text)
  //     );
  //     return { ...result, score: vector.score };
  //   }
  // );

  const fuzzyResults = getConventionsTextSearch(text, kaliData);

  // hybrid search
  // const commonResults = vectorResults
  //   .filter((result) => fuzzyResults.find((o) => o.idcc === result.idcc))
  //   .map((o) => ({ ...o, label: `IDCC${o.idcc}: ${o.title}` }));

  // const lonelyResults = vectorResults
  //   .slice(0, 3)
  //   .filter((result) => !fuzzyResults.find((o) => o.idcc === result.idcc))
  //   .map((o) => ({ ...o, label: `IDCC${o.idcc}: ${o.title}` }));

  // lonelyResults.push(
  //   ...fuzzyResults
  //     .filter((result) => !vectorResults.find((o) => o.idcc === result.idcc))
  //     .map((res) => ({
  //       ...res,
  //       idcc: res.idcc,
  //       label: `IDCC${res.idcc}: ${res.title}`,
  //     }))
  // );
  // const results = [ /*...commonResults, ...lonelyResults*/]
  //   // uniquify
  //   .filter(
  //     (c, i, all) =>
  //       !all.slice(i + 1, all.length).find((n) => n.idcc === c.idcc)
  //   )
  //   .slice(0, 3);

  return fuzzyResults;
};

export async function rechercheConventionParNom(
  args: z.infer<typeof RechercheConventionParameters>
) {
  log("rechercheConventionParNom", args);
  const conventions = await pickConventions(args.name);
  log("conventions", conventions);
  return {
    choices: conventions,
  };
}
