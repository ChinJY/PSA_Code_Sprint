import requests
from bs4 import BeautifulSoup
import openai
import logging
import boto3
import re

# Variables for save_record function
SIGNED_URL_EXPIRATION = 300  # The number of seconds that the Signed URL is valid
DYNAMO = boto3.resource("dynamodb")
TABLE = DYNAMO.Table("PSA_hackathon_2")
logger = logging.getLogger('boto3')
logger.setLevel(logging.INFO)

# For chat_func.
openai.api_key = " " # add API key


def lambda_handler(event, context):
  logger.info(event)

  if "https://www.marineinsight.com/shipping-news/" in event:
    logger.info("Event contains link")
    urlList = [event,
          'https://www.marineinsight.com/shipping-news/after-india-u-s-raises-concerns-over-chinese-spy-ships-visit-to-sri-lanka/',
          'https://www.marineinsight.com/shipping-news/russia-launches-attacks-on-ukraine-after-alleged-death-of-black-sea-fleet-commander/',
          'https://www.marineinsight.com/shipping-news/cocaine-worth-e157-million-seized-from-ship-in-irelands-biggest-drugs-haul-ever/',
          'https://www.marineinsight.com/shipping-news/russia-china-trade-imbalance-leads-to-150000-empty-containers-piling-up-in-russia/',
          'https://www.marineinsight.com/shipping-news/u-s-navy-accuses-iranian-vessels-of-harassing-its-marine-attack-helicopter-with-lasers/',
          'https://www.marineinsight.com/shipping-news/european-maritime-companies-ditching-toxic-ships-on-bangladesh-beaches-killing-workers/',
          ]
  else:
    logger.info("Event does not contain link")
    urlList = ['https://www.marineinsight.com/shipping-news/after-india-u-s-raises-concerns-over-chinese-spy-ships-visit-to-sri-lanka/',
          'https://www.marineinsight.com/shipping-news/russia-launches-attacks-on-ukraine-after-alleged-death-of-black-sea-fleet-commander/',
          'https://www.marineinsight.com/shipping-news/cocaine-worth-e157-million-seized-from-ship-in-irelands-biggest-drugs-haul-ever/',
          'https://www.marineinsight.com/shipping-news/russia-china-trade-imbalance-leads-to-150000-empty-containers-piling-up-in-russia/',
          'https://www.marineinsight.com/shipping-news/u-s-navy-accuses-iranian-vessels-of-harassing-its-marine-attack-helicopter-with-lasers/',
          'https://www.marineinsight.com/shipping-news/european-maritime-companies-ditching-toxic-ships-on-bangladesh-beaches-killing-workers/',
          ]  

  for url in urlList:
    # Send HTTP GET request to URL
    response = requests.get(url)
    # Check if the request was successful (status code 200)
    if response.status_code == 200:
        soup = BeautifulSoup(response.text, 'html.parser') # Parse the HTML content of the page using BeautifulSoup
        content_div = soup.find('div', class_='entry-content single-content') # Find div of certain class

        # if div is present
        if content_div:
            paragraphs = content_div.find_all('p',style=False,class_=False) # Find all <p> tags within the div
            clean_paragraphs = [p for p in paragraphs if len(p.find_all()) == 0] # Filter out 'p' with nested tag
            scraped_text=''

            # Print the text within each <p> tag
            for paragraph in clean_paragraphs:
                scraped_text += paragraph.get_text() # consolide all useful text in page into scraped_text
            
            # print(scraped_text) # confirm that text is correct
        else:
            print('Content div not found on the page.')
    else:
        print('Failed to retrieve the web page. Status code:', response.status_code)

    chatGPTResponse = chat_func(scraped_text)

    print(chatGPTResponse + '\n')

    if "NA" in chatGPTResponse:
      response = "lambda not relevant" # let vercel know that provided article was not relevant
    else:
      riskPattern = r'Risk:\s+(\d+)'
      riskMatch = re.search(riskPattern, chatGPTResponse)
      risk = riskMatch.group(1)
      riskCatPattern = r'Risk categories:\s+([A-Za-z\s\,]+)+\n'
      riskCatMatch = re.search(riskCatPattern, chatGPTResponse)
      riskCat = riskCatMatch.group(1)
      areaPattern = r'Area:\s+([A-Za-z\s\,\d\&]+)+\n'
      areaMatch = re.search(areaPattern, chatGPTResponse)
      area = areaMatch.group(1)
      reasoningPattern = r"Reasoning:\s+([A-Za-z\s\.\,\d\-\'\(\)]+)"
      reasoningMatch = re.search(reasoningPattern, chatGPTResponse)
      reasoning = reasoningMatch.group(1)
      save_record(url, area, risk, riskCat, reasoning)
      # print(risk + '\n')
      # print(riskCat + '\n')
      # print(area + '\n')
      # print(reasoning + '\n')
      response = "lambda success" # let vercel know that lambda function is complete
  return response

# Function for sending prompts to chatgpt and retrieving response
def chat_func(chat_input):
    response = openai.ChatCompletion.create(
        temperature=0,
        model="gpt-3.5-turbo",
        messages=[
            {"role": "system", "content": "If the following news article relevant to freight shipping, assess the risk to shipping in that area on a scale of 5. Give the area affected, along with the risk value, risk categories and reasoning. For example: 'Risk: 4 \n Risk categories: Environmental \n Area: South China Sea \n Reasoning: There are severe typhoons in the area.' For risk categories, select from the following: <Operational>, <Regulatory>, <Financial>, <Market>, <Security>, <Supply Chain>, <Environmental>, <Geopolitical>, <Insurance>, <Health and Safety>, <Legal>, <Logistical>"},
            {"role": "user", "content": "This is the article: <{}>".format(chat_input)},
            {"role": "system", "content": 'If the area is not applicable, just respond with "Risk: NA \n Area: NA".'}
        ]
    )
    return(response['choices'][0]['message']['content'])

def save_record(source, area, risk, riskCat, reasoning):
    logger.info("Saving record to DynamoDB...")
    TABLE.put_item(
       Item={
            'Source': source,
            'Area': area,
            'Risk': risk,
            'RiskCat': riskCat,
            'Reasoning': reasoning
        }
    )
    logger.info("Saved record to DynamoDB")