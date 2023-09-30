'use server'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { NextRequest, NextResponse } from "next/server";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    // Retrieve data from dynamoDB
    const command = new ScanCommand({
      TableName: "PSA_hackathon",
    });
    const response = await docClient.send(command);
    const responseItem = response.Items; // store dynamoDB response in reponseItem

    const source: string[] = [];
    const risk: string[] = [];
    const riskCat: string[] = [];
    const area: string[] = [];
    const reasoning: string[] = [];

    for (const item of responseItem!) {
      if (item.Source) {
        source.push(item.Source);
      }
      if (item.Risk) {
        risk.push(item.Risk);
      }
      if (item.RiskCat) {
        riskCat.push(item.RiskCat);
      }
      if (item.Area) {
        area.push(item.Area);
      }
      if (item.Reasoning) {
        reasoning.push(item.Reasoning);
      }
    }

    const result = {
      source: source,
      risk: risk,
      riskCat: riskCat,
      area: area,
      reasoning: reasoning
    };
    // console.log("result: ", result);
    return NextResponse.json({ payload: result });
  } catch (error) {
    console.error("Error retrieving from DynamoDB:", error);
    return NextResponse.json({ message: "Error retrieving from DynamoDB" });
  }
}