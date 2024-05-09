// 1. Import OpenAI library
import OpenAI from "openai"
// 2. Import Pinecone database client
import { Pinecone } from '@pinecone-database/pinecone'
import { env } from "~/env";
// 5. Configuration for Pinecone and OpenAI

type DataEmbed = {
  textToEmbed: string
  favouriteActivities: string[]
  born: string
}

const config = {
  similarityQuery: {
    topK: 1, // Top results limit
    includeValues: false, // Exclude vector values
    includeMetadata: true, // Include metadata
  },
  namespace: "nms-1", // Pinecone namespace
  indexName: "pinecone-test3", // Pinecone index name
  embeddingID: "pc", // Embedding identifier
  dimension: 1536, // Embedding dimension
  metric: "cosine", // Similarity metric
  cloud: "aws", // Cloud provider
  region: "us-east-1", // Serverless region
  query: "What is my cat's name?", // Query example
}

const dataToEmbed : DataEmbed[] = [
  {
    textToEmbed: "My dog's name is Steve.",
    favouriteActivities: ["playing fetch", "running in the park"],
    born: "July 19, 2023",
  },
  {
    textToEmbed: "My cat's name is Sandy.",
    favouriteActivities: ["napping", "chasing laser pointers"],
    born: "August 7, 2019",
  },
]

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

const pc = new Pinecone({
  apiKey: env.PINECONE_API_KEY!,
})

// Function to store embeddings in Pinecone.
async function storeEmbeddings() {
  await Promise.all(
    dataToEmbed.map(async (item, index) => {
      // NOTE(sahaj): This is already done by Ondra and in the csv form.
      const embedding = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: item.textToEmbed,
      })
      // Define index name and unique ID for each embedding (also in the csv)
      const indexName = config.indexName;
      const id = `${config.embeddingID}-${index + 1}`;
      // Upsert embedding into Pinecone with new metadata
      // 
      // await pc.upsert(
      //   vectors=[
      //     {
      //       "id": i, 
      //       "values": embed_raw[i], 
      //       "metadata": {"title": title[i],
      //                    “source": source[i],
      //                    “description”: description[i],
      //                    “thumbnail_src": thumbnail_src[i],
      //                    “redirect": redirect[i],
      //                    “year": year[i],
      //                    “embed_2d”: embed_2d[i]
      //     }
      // ]);

      await pc
        .index(indexName)
        .namespace(config.namespace)
        .upsert([
          {
            id: id,
            values: embedding.data[0]?.embedding as number[],
            metadata: { ...item },
          },
        ]);

      console.log(`Embedding ${id} stored in Pinecone.`);
    })
  );
}

// 15. Function to query embeddings in Pinecone
async function queryEmbeddings(queryText : string) {
  // Create query embedding using OpenAI
  // this will be for the user input, seeing which embeddings in pincone
  // is closest to the query embeddings here
  const queryEmbedding = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: queryText,
  });
  // 17. Perform the query
  const queryResult = await pc
    .index(config.indexName)
    .namespace(config.namespace)
    .query({
      ...config.similarityQuery,
      vector: queryEmbedding.data[0]?.embedding as number[],
    });
  console.log(`Query: "${queryText}"`);
  console.log(`Result:`, queryResult);
  console.table(queryResult.matches);
}

// Function to manage Pinecone index
async function manageIndex(action : string) {
  // 20. Check if index exists
  const indexExists = (await pc.listIndexes()).indexes?.some((index : any) => index.name === config.indexName);
  // 21. Create or delete index based on action
  if (action === "create") {
    if (indexExists) {
      console.log(`Index '${config.indexName}' already exists.`);
    } else {
      await pc.createIndex({
        name: config.indexName,
        dimension: config.dimension,
        metric: config.metric as any,
        spec: { serverless: { cloud: config.cloud as any, region: config.region } },
      });
      console.log(`Index '${config.indexName}' created.`);
    }
  } else if (action === "delete") {
    if (indexExists) {
      await pc.deleteIndex(config.indexName);
      console.log(`Index '${config.indexName}' deleted.`);
    } else {
      console.log(`Index '${config.indexName}' does not exist.`);
    }
  } else {
    console.log('Invalid action specified. Use "create" or "delete".');
  }
}

export const pineCall = async() => {
  console.log("start")
  await manageIndex("create");
  await storeEmbeddings();
  await queryEmbeddings(config.query);
  console.log("end")
  // await manageIndex("delete");
}
