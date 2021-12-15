import * as React from "react";
import * as ReactDOM from "react-dom";
import SHA256 from "crypto-js/sha256";
import HmacSHA256 from "crypto-js/hmac-sha256";

function hashFromUrl() {
  if (!location.search) return;
  var res = location.search
    .substr(1)
    .split("&")
    .map((x) => x.split("="))
    .find(([k, v]) => k === "hash");
  if (res) return res[1];
}
class UI extends React.Component {
  state = { hash: hashFromUrl() || "", amount: 30 };
  setHash = (e) => this.setState({ hash: e.target.value });
  showMore = () => this.setState({ amount: this.state.amount * 2 });
  render() {
    const { hash, amount } = this.state;
    const [current, ...previous] = getPreviousResults(hash, amount);
    return (
      <div>
        <table>
          <thead>
            <tr>
              <th>Game hash</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <label>
                  First hash:{" "}
                  <input value={this.state.hash} onChange={this.setHash} />
                </label>
              </td>
              {hash && <Result {...current} />}
            </tr>
            {hash &&
              previous.map((result) => (
                <tr key={result.hash}>
                  <td>
                    <pre>{result.hash}</pre>
                  </td>
                  <Result {...result} />
                </tr>
              ))}
          </tbody>
        </table>
        {hash && <button onClick={this.showMore}>Show more</button>}
      </div>
    );
  }
}
const Result = (result) => (
  <td style={{ background: result.color }}>{result.result}</td>
);

function getPreviousHash(gameHash) {
  return SHA256(gameHash).toString();
}

function gameResultToColor(result) {
  if (result < 1.5) {
    return "red";
  } else if (result < 2 && result >= 1.5) {
    return "lightgreen";
  } else if (result >= 1000) {
    return "blue";
  } else {
    return "green";
  }
}

const salt = "000000000000000007a9a31ff7f07463d91af6b5454241d5faf282e5e0fe1b3a";
function saltHash(hash) {
  return SHA256(JSON.stringify([hash, salt])).toString();
}

function crashPointFromHash(serverSeed) {
  // see: provably fair seeding event
  var hash = HmacSHA256(salt, serverSeed).toString();

  // In 4 of 100 games the game crashes instantly.
  if (divisible(hash, 25)) return (1.0).toFixed(2);

  // Use the most significant 52-bit from the hash to calculate the crash point
  var h = parseInt(hash.slice(0, 52 / 4), 16);
  var e = Math.pow(2, 52);

  return (Math.floor(((e - h / 50) / (e - h)) * 100) / 100).toFixed(2);
}

function getGameInformation(hash) {
  const result = crashPointFromHash(hash);
  return {
    result,
    hash,
    seed: saltHash(hash),
    color: gameResultToColor(result)
  };
}
function getPreviousResults(gameHash, count) {
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(getGameInformation(gameHash));
    gameHash = getPreviousHash(gameHash);
  }
  return results;
}

function divisible(hash, mod) {
  // So ABCDEFGHIJ should be chunked like  AB CDEF GHIJ
  var val = 0;

  var o = hash.length % 4;
  for (var i = o > 0 ? o - 4 : 0; i < hash.length; i += 4) {
    val = ((val << 16) + parseInt(hash.substring(i, i + 4), 16)) % mod;
  }

  return val === 0;
}

ReactDOM.render(<UI />, document.querySelector("#ui"));
