'use client'
import 'app/globals.css';
import { useState} from "react";
import axios from "axios";
import { useRouter } from 'next/navigation';
import { Line } from 'rc-progress';

type ListType = string[];

export default function Home() {
  const [sourceList, setSource] = useState<ListType>([]);
  const [areaList, setArea] = useState<ListType>([]);
  const [riskList, setRisk] = useState<ListType>([]);
  const [riskCatList, setRiskCat] = useState<ListType>([]);
  const [reaasoningList, setReasoning] = useState<ListType>([]);
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [userInput, setUserInput] = useState('');

  const invokeLambda = async () => {
    let { data } = await axios.post(
      "/api/lambda",
      {
       userInput, 
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // console.log('Lambda Response:', data);
  }

  const retrieveFromDynamo = async () => {
    let { data } = await axios.post(
      "/api/retrieveFromDynamo",
      {
        
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    // console.log('DynamoDB Response:', data);
    setSource(data.payload.source);
    setArea(data.payload.area);
    setRisk(data.payload.risk);
    setRiskCat(data.payload.riskCat);
    setReasoning(data.payload.reasoning)
  }

  const Table: React.FC<{ list1: ListType; list2: ListType; list3: ListType; list4: ListType; list5: ListType }> = ({ list1, list2, list3, list4, list5 }) => {
    return (
      <table className="bordered-table">
        <thead>
          <tr>
            <th>Source</th>
            <th>Affected Region</th>
            <th>Risk (1 = Lowest Risk, 5 = Highest Risk)</th>
            <th>Risk Categories</th>
            <th>Reasoning</th>
          </tr>
        </thead>
        <tbody>
          {list1.map((item, index) => (
            <tr key={index}>
              <td>{item}</td>
              <td>{list2[index]}</td>
              <td>{list3[index]}</td>
              <td>{list4[index]}</td>
              <td>{list5[index]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const startLoadingAnimation = () => {
    setLoadingVisible(true);
    let percent = 0;
    const interval = setInterval(() => {
      percent += (100 / 60);
      setLoadingPercent(Math.min(percent, 100));
      if (percent >= 100) {
        clearInterval(interval);
        setLoadingVisible(false);
        retrieveFromDynamo();
      }
    }, 350); // Update every 100ms
  };

  const clickFunction = () => {
    invokeLambda();
    setTimeout(() => {
      retrieveFromDynamo();
    }, 13000)
    startLoadingAnimation();
  }

  const router = useRouter(); // enable the use of Link below

  return (
    <div>
      <h3 className='h3Class'>Click the button to obtain the latest insights, or paste a link from &quot;https://www.marineinsight.com/shipping-news/&quot; into the box below before pressing the button to generate insights from a custom article (No insights will appear if the article is not relevant to shipping).</h3>
      <div className="input-div">
        <input
            className="input-field"
            type="text"
            placeholder="https://www.marineinsight.com/shipping-news/"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
        />
      </div>
      <div className="center-button">
        <button className="buttonClass" onClick={clickFunction}>Generate Insights</button>
      </div>
      {loadingVisible ? (
        <div><Line percent={loadingPercent} strokeWidth={1} strokeColor="#35dea6" /></div>
        ) : null}
      <Table list1={sourceList} list2={areaList} list3={riskList} list4={riskCatList} list5={reaasoningList} />
    </div>
  )
}