import { systemConfig } from "@/lib/infra/config";

const DATASET_ID = systemConfig.external.datasetId;
const RS_URI = systemConfig.external.rsUri;
const RS_API_KEY = systemConfig.external.rsApiKey;


interface CreateCollectionResponse {
  code: number;
  message: string;
  data: {
    collectionId: string;
    results: {
      insertLen: number;
    };
  } | null;
}

interface DeleteCollectionResponse {
  code: number;
  message: string;
  data: null;
}

export async function createKnowledgeBaseCollection(
  projectName: string,
  toolName: string,
  description: string | null,
  toolId: string
): Promise<string | null> {
  if (!DATASET_ID || !RS_URI || !RS_API_KEY) {
    console.error("Knowledge Base configuration missing");
    return null;
  }

  try {
    const text = JSON.stringify({
      projectName,
      toolName,
      description: description || "",
      toolId
    });

    const response = await fetch(`${RS_URI}/core/dataset/collection/create/text`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RS_API_KEY}`,
      },
      body: JSON.stringify({
        datasetId: DATASET_ID,
        name: `${projectName} - ${toolName} - ${toolId}`,
        text,
        trainingType: "chunk",
        chunkSettingMode: "auto",
        chunkSplitMode: "size",
        chunkSize: 1500,
        indexSize: 512,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create KB collection:", errorText);
      return null;
    }

    const result: CreateCollectionResponse = await response.json();
    
    if (result.code !== 200 || !result.data) {
        console.error("Failed to create KB collection (API Error):", result.message);
        return null;
    }

    return result.data.collectionId;
  } catch (error) {
    console.error("Error creating KB collection:", error);
    return null;
  }
}

export async function deleteKnowledgeBaseCollection(collectionId: string): Promise<boolean> {
  if (!RS_URI || !RS_API_KEY) {
    console.error("Knowledge Base configuration missing");
    return false;
  }

  try {
    const response = await fetch(`${RS_URI}/core/dataset/collection/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RS_API_KEY}`,
      },
      body: JSON.stringify({
        collectionIds: [collectionId],
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error("Failed to delete KB collection:", errorText);
        return false;
    }

    const result: DeleteCollectionResponse = await response.json();
    
    if (result.code !== 200) {
         console.error("Failed to delete KB collection (API Error):", result.message);
         return false;
    }

    return true;
  } catch (error) {
    console.error("Error deleting KB collection:", error);
    return false;
  }
}