import {
  Page,
  Text,
  Spacer,
  Link,
  Loading,
  Table,
  Input,
  Checkbox,
  Textarea,
  Dot,
  Tooltip,
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
  "0xc2d82a3e2bae0a50f4aeb438285804354b467bc0": "48 hour Timelock",
  "0x0040e05ce9a5fc9c0abf89889f7b60c2fc278416": "24 hour Timelock",
  "0xd92c7faa0ca0e6ae4918f3a83d9832d9caeaa0d3": "12 hour Timelock",
};
const targetNames = {
  "0xbd17b1ce622d73bd438b9e658aca5996dc394b0d": "Masterchef",
};
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

// Addresses
const TARGET_ADDRESS_NAMES = {
  "0xbd17b1ce622d73bd438b9e658aca5996dc394b0d": "Masterchef",
  "0xc2d82a3e2bae0a50f4aeb438285804354b467bc0": "Timelock (48 hr)",
  "0x0040e05ce9a5fc9c0abf89889f7b60c2fc278416": "Timelock (24 hr)",
  "0xd92c7faa0ca0e6ae4918f3a83d9832d9caeaa0d3": "Timelock (12 hr)",
  "0x2ff3e6c2e054abf45e21f790163970df82b0ea90": "Controller v3",
  "0x6847259b2b3a4c17e7c43c54409810af48ba5210": "Controller v4",
  "0x68d14d66b2b0d6e157c06dc8fefa3d8ba0e66a89": "psCRV v2",
  "0x8e1ed86c27e1861d044c27b66574d6a0249a3c1c": "StrategyCurvesCRVv3_2",
  "0xcffa068f1e44d98d3753966ebd58d4cfe3bb5162": "psUNI ETH/DAI v2",
  "0x0697d05738b456bcc8f06023219da351ae252912": "StrategyUniEthDaiLpv4",
  "0x53bf2e62fa20e2b4522f05de3597890ec1b352c6": "psUNI ETH/USDC v2",
  "0xb48b92f8962f880d2f072f4e5fdfc748ceda7727": "StrategyUniEthUsdcLpv4",
  "0x09fc573c502037b149ba87782acc81cf093ec6ef": "psUNI ETH/USDT v2",
  "0x3577797668c6fe415b21bf85ba44df34318dd80d": "StrategyUniEthUsdtLpv4",
  "0x1bb74b5ddc1f4fc91d6f9e7906cf68bc93538e33": "p3CRV",
  "0x8f01bb820bcd0b0b7d873862c531a88822747042": "StrategyCurve3CRVv2",
  "0x2e35392f4c36eba7ecafe4de34199b2373af22ec": "pRenWBtcCrv",
  "0xb606602c2ac912b52437817add9362b87776a6a6": "StrategyCurveRenCRVv2",
  "0xc80090aa05374d336875907372ee4ee636cbc562": "psUNI ETH/WBTC v2",
  "0xd8de542d2140eecc49ffdf056e51aa9261f974d6": "StrategyUniEthWBtcLpv4",
  "0x6949bb624e8e8a90f87cd2058139fcd77d2f3f87": "pDAI",
  "0xcd892a97951d46615484359355e3ed88131f829d": "StrategyCmpV2",
};

const Main = () => {
  const [history, setHistory] = useState([]);
  const [showRawTarget, setShowRawTarget] = useState(false);
  const [showRawData, setShowRawData] = useState(false);
  const [functionSignatureFilter, setFunctionSignatureFilter] = useState("");
  const [txTypeFilter, setTxTypeFilter] = useState("");

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
            "[" + decodedData.map((x) => x.toString()).join(", ") + "]";

          decodedFunction.params[3].rawValue = data;
        }

        // ETA in human reable format
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

        // Target as a link
        const rawTarget = decodedFunction.params[0].value;
        let target = rawTarget.toLowerCase();

        if (TARGET_ADDRESS_NAMES[target]) {
          target = (
            <Link color href={`https://etherscan.io/address/${rawTarget}`}>
              {TARGET_ADDRESS_NAMES[target]}
            </Link>
          );
        }

        return {
          hash,
          decodedFunctionRaw: JSON.stringify(
            decodedFunction.params.map((x) => {
              return { k: x.name, v: x.value };
            })
          ),
          txTypeRaw: decodedFunction.name,
          txType: (
            <Link color href={`https://etherscan.io/tx/${hash}`}>
              {decodedFunction.name}
            </Link>
          ),
          to: (
            <Link color href={`https://etherscan.io/address/${to}`}>
              {timelockNames[to]}
            </Link>
          ),
          timestamp: moment(timestamp * 1000).from(Date.now()),
          rawTarget,
          target,
          value: decodedFunction.params[1].value,
          signature: decodedFunction.params[2].value,
          data: (
            <Textarea
              minHeight="3"
              width="100%"
              value={decodedFunction.params[3].value}
            ></Textarea>
          ),
          rawData: (
            <Textarea
              minHeight="3"
              width="100%"
              value={decodedFunction.params[3].rawValue}
            ></Textarea>
          ),
          eta: decodedFunction.params[4].value,
        };
      })
      .filter((x) => x !== null);

    // Key: decodedFunctionRaw, Value: Hash
    const nonqueuedTransactionKV = decoded
      .filter((x) => x.txTypeRaw.toLowerCase() !== "queuetransaction")
      .reduce((acc, x) => {
        // Order matters here as the transactions are sorted descending via timestamp
        // So if we have 2 execute tx's w/ the same params,
        // the latest one will be the successful one.
        return {
          [x.decodedFunctionRaw]: x.hash,
          ...acc,
        };
      }, {});

    const executedTransactions = decoded
      .filter((x) => x.txTypeRaw.toLowerCase() === "executetransaction")
      .map((x) => x.decodedFunctionRaw);

    const cancelledTransactions = decoded
      .filter((x) => x.txTypeRaw.toLowerCase() === "canceltransaction")
      .map((x) => x.decodedFunctionRaw);

    const decodedWithContext = decoded.map((x) => {
      if (x.txTypeRaw.toLowerCase() === "queuetransaction") {
        if (cancelledTransactions.includes(x.decodedFunctionRaw)) {
          return {
            status: (
              <Tooltip
                text={
                  <Link
                    color
                    href={`https://etherscan.io/tx/${
                      nonqueuedTransactionKV[x.decodedFunctionRaw]
                    }`}
                  >
                    Cancelled
                  </Link>
                }
              >
                <Dot></Dot>
              </Tooltip>
            ),
            ...x,
          };
        }
        if (executedTransactions.includes(x.decodedFunctionRaw)) {
          return {
            status: (
              <Tooltip
                text={
                  <Link
                    color
                    href={`https://etherscan.io/tx/${
                      nonqueuedTransactionKV[x.decodedFunctionRaw]
                    }`}
                  >
                    Executed
                  </Link>
                }
              >
                <Dot type="success"></Dot>
              </Tooltip>
            ),
            ...x,
          };
        }

        return {
          status: (
            <Tooltip text="Queued">
              <Dot type="warning"></Dot>
            </Tooltip>
          ),
          ...x,
        };
      }

      return { ...x };
    });

    setHistory(
      decodedWithContext.map((x, i) => {
        return { index: i, ...x };
      })
    );
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
    <Page
      size="large"
      style={{
        minWidth: "100vw",
        height: "100vh",
        overflow: "scroll",
        whiteSpace: "nowrap",
      }}
    >
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
      {history.length > 0 && (
        <Table
          style={{
            textAlign: "left",
          }}
          data={history
            .map((x) => {
              let y = x;
              if (showRawData) {
                y = { ...y, data: x.rawData };
              }

              if (showRawTarget) {
                y = { ...y, target: x.targetRaw };
              }

              return y;
            })
            .filter((x) => {
              let passed = true;
              if (functionSignatureFilter !== "") {
                passed = x.signature
                  .toLowerCase()
                  .includes(functionSignatureFilter.toLowerCase());
              }

              if (txTypeFilter !== "") {
                passed =
                  passed &&
                  x.txTypeRaw
                    .toLowerCase()
                    .includes(txTypeFilter.toLowerCase());
              }

              return passed;
            })}
        >
          <Table.Column prop="status" label="status" />
          <Table.Column
            prop="txType"
            label={
              (
                <>
                  TX TYPE&nbsp;&nbsp;
                  <Input
                    size="mini"
                    width="120px"
                    status="secondary"
                    onChange={(e) => {
                      setTxTypeFilter(e.target.value);
                    }}
                    value={txTypeFilter}
                    placeholder="FILTER TX TYPE"
                  />
                </>
              ) as any
            }
          />
          <Table.Column prop="to" label="to" />
          <Table.Column prop="timestamp" label="timestamp" />
          <Table.Column
            prop="target"
            label={
              (
                <>
                  target&nbsp;&nbsp;
                  <Checkbox
                    checked={showRawTarget}
                    onChange={(e) => {
                      setShowRawTarget(!showRawTarget);
                    }}
                    size="mini"
                  >
                    show raw
                  </Checkbox>
                </>
              ) as any
            }
          />
          <Table.Column prop="value" label="value" />
          <Table.Column
            prop="signature"
            label={
              (
                <>
                  signature&nbsp;&nbsp;
                  <Input
                    size="mini"
                    width="100px"
                    status="secondary"
                    onChange={(e) => {
                      setFunctionSignatureFilter(e.target.value);
                    }}
                    value={functionSignatureFilter}
                    placeholder="FILTER SIG"
                  />
                </>
              ) as any
            }
          />
          <Table.Column
            prop="data"
            label={
              (
                <>
                  data&nbsp;&nbsp;
                  <Checkbox
                    checked={showRawData}
                    onChange={(e) => {
                      setShowRawData(!showRawData);
                    }}
                    size="mini"
                  >
                    show raw
                  </Checkbox>
                </>
              ) as any
            }
          />
          <Table.Column prop="eta" label="eta" />
        </Table>
      )}
    </Page>
  );
};

export default Main;
