import axios from 'axios';
import AWS from 'aws-sdk';
import { NextRequest, NextResponse } from "next/server";

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION,
});

export async function POST(req: NextRequest, res: NextResponse) {
  try {
    console.log("Lambda API route started");
    const payload = await req.json;
    const lambdaArn = 'arn:aws:lambda:'+AWS.config.region+':'+'646415789532'+':function:PSA_lambda';
    const lambda = new AWS.Lambda(); // Create a Lambda instance

    // Create an Axios instance with IAM credentials
    const axiosInstance = axios.create({
      baseURL: 'https://lambda.' + AWS.config.region + '.amazonaws.com',
      headers: {
        'Content-Type': 'application/json',
      },
      // Sign Axios requests with IAM credentials using AWS SDK
      transformRequest: [ 
        (data, headers) => {
          return lambda.invoke(
            {
              FunctionName: lambdaArn,
              InvocationType: 'RequestResponse',
              Payload: JSON.stringify(payload),
            },
            (err, data) => {
              if (err) {
                // console.error('Error invoking Lambda (2):', err);
              } else{
                // console.log('Lambda Success:', data);
              }
            }
          );
        },
      ],
    });

    // Invoke Lambda function and capture response
    const lambdaResponse = await axiosInstance.post('/', {timeout: 10000});
    // console.log('Lambda response: ', lambdaResponse.data.items);
    return NextResponse.json({ payload: lambdaResponse.data.items });
  } catch (error) {
    // console.error('Error invoking Lambda (3):', error);
    return NextResponse.json({ message: "Error uploading" });
  }
}