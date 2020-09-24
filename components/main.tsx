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
  Dot,
} from "@zeit-ui/react";

import { ethers } from "ethers";
import { default as abiDecoder } from "abi-decoder";
import { useState, useEffect } from "react";

import moment from "moment";
import masterchefAbi from "./masterchef-abi.json";
import timelockAbi from "./timelock-abi.json";
import gnosisSafeAbi from "./gnosis-safe-abi.json";

const devAddress = "0x9d074E37d408542FD38be78848e8814AFB38db17";
const timelockAddresses = [
  "0xc2d82a3e2bae0a50f4aeb438285804354b467bc0",
  "0x0040E05CE9A5fc9C0aBF89889f7b60c2fC278416",
  "0xD92c7fAa0Ca0e6AE4918f3a83d9832d9CAEAA0d3",
].map((x) => x.toLowerCase());
const timelockNames = {
  '0xc2d82a3e2bae0a50f4aeb438285804354b467bc0': '48 hour Timelock',
  '0x0040e05ce9a5fc9c0abf89889f7b60c2fc278416': '24 hour Timelock',
  '0xd92c7faa0ca0e6ae4918f3a83d9832d9caeaa0d3': '12 hour Timelock',
}
const etherscanProvider = new ethers.providers.EtherscanProvider(
  1,
  "QJPHEUVRS84V4KH16EG1YTUQMHJMH9PBBK"
);
const infuraProvider = new ethers.providers.InfuraProvider(1);

// Timelock contract
abiDecoder.addABI(timelockAbi);
abiDecoder.addABI(masterchefAbi);
abiDecoder.addABI(gnosisSafeAbi);

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
    const h = await etherscanProvider.getHistory(devAddress);
    const newest = h.slice(1).reverse();

    const now = new Date().getTime();

    const decoded = newest
      .map(({ data, from, blockNumber, timestamp, hash }) => {
        const tx = abiDecoder.decodeMethod(data);

        const to = tx.params[0].value.toLowerCase();

        // Only pay attention to timelock contract
        if (!timelockAddresses.includes(to)) {
          return null;
        }

        // 2 is the data
        const decodedFunction = abiDecoder.decodeMethod(tx.params[2].value);

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
            "[" +
            decodedData.map((x) => x.toString()).join(", ") +
            "]" +
            "\n" +
            data;
        }

        // ETA
        decodedFunction.params = decodedFunction.params.map((x) => {
          if (x.name === "eta") {
            const t = parseInt(x.value) * 1000;
            const formattedTime = moment(t).from(now);

            return {
              ...x,
              value: `${x.value} (${formattedTime})`,
            };
          }

          return x;
        });

        return {
          decodedFunction,
          from,
          to,
          timestamp,
          blockNumber,
          hash,
        };
      })
      .filter((x) => x !== null);

    const receipts = await Promise.all(
      decoded.map((x) => infuraProvider.getTransactionReceipt(x.hash))
    );

    const decodedWithStatus = decoded.map((x, i) => {
      return {
        ...x,
        status: receipts[i].status,
      };
    });

    setHistory(decodedWithStatus);
  };

  useEffect(() => {
    if (history.length > 0) return;

    try {
      getHistory();
    } catch (e) {
      console.log("ERROR");
    }
  }, []);

  return (
    <Page>
      <Text h2>Pickle Finance Timelock Transactions</Text>
      <Text type="secondary">
        Only last 10,000 transactions displayed. The transactions are executed
        from a{" "}
        <Link
          color
          href="https://etherscan.io/address/0x9d074E37d408542FD38be78848e8814AFB38db17"
        >
          multisig wallet
        </Link>
        , which is why it isn't showing up on the{" "}
        <Link
          color
          href="https://etherscan.io/address/0xc2d82a3e2bae0a50f4aeb438285804354b467bc0"
        >
          timelock contract
        </Link>
        .
      </Text>
      <Spacer y={0.33} />
      {history.length === 0 && <Loading>Loading</Loading>}

      {history.length > 0 &&
        history.map((x) => {
          const { decodedFunction, blockNumber, from, to, hash, timestamp } = x;
          const now = Date.now();

          const humanBefore = moment(timestamp * 1000).from(now);

          return (
            <>
              <Row>
                <Col>
                  <Card>
                    <Text h4>
                      <Link href={`https://etherscan.io/tx/${hash}`} color>
                        {decodedFunction.name}
                      </Link>{' '}
                      ({timelockNames[to]})
                      {x.status === 0 && (
                        <Dot style={{ marginLeft: "10px" }} type="error">
                          Tx reverted
                        </Dot>
                      )}
                    </Text>
                    <Text type="secondary">
                      <Link color href={`https://etherscan.io/address/${from}`}>
                        Tx Sender
                      </Link>{" "}
                      | Block Number: {blockNumber} | {humanBefore}
                    </Text>
                    <Table
                      data={decodedFunction.params}
                      style={{ wordBreak: "break-word" }}
                    >
                      <Table.Column prop="name" label="name" width={200} />
                      <Table.Column prop="value" label="value" />
                    </Table>
                  </Card>
                </Col>
              </Row>
              <Spacer y={0.5} />
            </>
          );
        })}
    </Page>
  );
};

export default Main;
