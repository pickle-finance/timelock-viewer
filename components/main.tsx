import {
  Page,
  Text,
  Spacer,
  Link,
  Row,
  Col,
  Card,
  Loading,
  Table,
} from "@zeit-ui/react";

import { ethers } from "ethers";
import { default as abiDecoder } from "abi-decoder";
import { useState, useEffect } from "react";

import masterchefAbi from "./masterchef-abi.json";
import timelockAbi from "./timelock-abi.json";

const timelockAddress = "0x9a8541ddf3a932a9a922b607e9cf7301f1d47bd1";
const etherscanProvider = new ethers.providers.EtherscanProvider(1);

// Timelock contract
abiDecoder.addABI(timelockAbi);
abiDecoder.addABI(masterchefAbi);

// Transactions to help decode
// queueTransaction, cancelTransaction, executeTransaction
const specialFunctionNames = [
  "queueTransaction",
  "cancelTransaction",
  "executeTransaction",
];

const Main = () => {
  const [history, setHistory] = useState([]);

  const getHistory = async () => {
    // Don't want first tx, as that is contract data
    const h = await etherscanProvider.getHistory(timelockAddress);
    const newest = h.slice(1).reverse();

    const decoded = newest.map(
      ({ data, from, blockNumber, timestamp, hash }) => {
        const decodedFunction = abiDecoder.decodeMethod(data);

        if (specialFunctionNames.includes(decodedFunction.name)) {
          // target, value, signature, data, eta
          const signature = decodedFunction.params[2].value;
          const data = decodedFunction.params[3].value;

          const functionParams = signature
            .split("(")[1]
            .split(")")[0]
            .split(",");

          const decodedData = ethers.utils.defaultAbiCoder.decode(
            functionParams,
            data
          );

          decodedFunction.params[3].value =
            "[" + decodedData.map((x) => x.toString()).join(", ") + "]";
        }

        return {
          decodedFunction,
          from,
          timestamp,
          blockNumber,
          hash,
        };
      }
    );

    setHistory(decoded);
  };

  useEffect(() => {
    if (history.length > 0) return;

    getHistory();
  }, []);

  return (
    <Page>
      <Text h2>SushiSwap Timelock Transactions</Text>
      <Text type="secondary">
        Only last 10,000 transactions displayed.{" "}
        <Link
          color
          href="https://etherscan.io/address/0x9a8541ddf3a932a9a922b607e9cf7301f1d47bd1"
        >
          Timelock Contract.
        </Link>
      </Text>
      <Spacer y={0.33} />
      {history.length === 0 && <Loading>Loading</Loading>}

      {history.length > 0 &&
        history.map((x) => {
          const { decodedFunction, blockNumber, from, hash, timestamp } = x;
          const humanTimestamp = new Date(timestamp * 1000).toTimeString();

          return (
            <>
              <Row>
                <Col>
                  <Card>
                    <Text h4>
                      <Link href={`https://etherscan.io/tx/${hash}`} color>
                        {decodedFunction.name}
                      </Link>
                    </Text>
                    <Text type="secondary">
                      <Link color href={`https://etherscan.io/address/${from}`}>
                        Tx Sender
                      </Link>{" "}
                      | Block Number: {blockNumber} | {humanTimestamp}
                    </Text>
                    <Table data={decodedFunction.params}>
                      <Table.Column prop="name" label="name" />
                      <Table.Column prop="value" label="value" />
                    </Table>
                  </Card>
                </Col>
              </Row>
              <Spacer y={0.5} />
            </>
          );
        })}

      <Spacer y={1} />

      <Row style={{ textAlign: "center" }}>
        <Col>
          <Text h5>
            by{" "}
            <Link color href="https://twitter.com/kendricktrh">
              @kendricktrh
            </Link>,{' '}
            <Link color href="https://github.com/abstracted-finance/sushi-txs-wtf">
              code
            </Link>
          </Text>
        </Col>
      </Row>
    </Page>
  );
};

export default Main;
