
import { useState } from "react";
import * as XLSX from "xlsx";
import * as pdfjsLib from "pdfjs-dist";

import "./App.css";

// pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
//   "pdfjs-dist/build/pdf.worker.min.mjs",
//   import.meta.url
// ).toString();

// import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;


function normalize(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function extractRollNumbers(text) {
  // Adjust this pattern to match your actual roll number format.
  return [
    ...new Set(
      text.match(/\b\d{5,15}\b/g) || []
    ),
  ];
}

async function readPdf(file) {
  const buffer = await file.arrayBuffer();

  const pdf = await pdfjsLib.getDocument({
    data: new Uint8Array(buffer),
  }).promise;

  let text = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    text +=
      content.items.map((item) => item.str).join(" ") +
      "\n";
  }

  return text;
}

function App() {
  const [excelFile, setExcelFile] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [folderHandle, setFolderHandle] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");


  const [showResults, setShowResults] = useState(false);

  async function chooseFolder() {
    try {
      const handle = await window.showDirectoryPicker({
        mode: "read",
      });

      setFolderHandle(handle);
      setFolderName(handle.name);
      setResults([]);
      setError("");
    } catch (err) {
      if (err.name !== "AbortError") {
        setError(
          "Unable to access the folder. Use Chrome or Edge and allow folder access."
        );
      }
    }
  }

  // async function scanFiles() {
  //   if (!excelFile || !folderHandle) {
  //     setError("Please select an Excel file and a PDF folder.");
  //     return;
  //   }

  //   setLoading(true);
  //   setError("");
  //   setResults([]);

  //   try {
  //     // Read Excel workbook.
  //     const buffer = await excelFile.arrayBuffer();
  //     const workbook = XLSX.read(buffer, {
  //       type: "array",
  //       raw: false,
  //     });

  //     const sheet = workbook.Sheets[workbook.SheetNames[0]];
  //     const rows = XLSX.utils.sheet_to_json(sheet, {
  //       defval: "",
  //       raw: false,
  //     });

  //     if (!rows.length) {
  //       throw new Error("The Excel sheet is empty.");
  //     }

  //     // Find candidate name and roll number columns.
  //     const headers = Object.keys(rows[0]);

  //     const nameColumn = headers.find((h) =>
  //       /candidate.?name|student.?name|name/i.test(h)
  //     );

  //     const rollColumn = headers.find((h) =>
  //       /roll.?no|roll.?number|rollno|rollnumber/i.test(h)
  //     );

  //     if (!nameColumn || !rollColumn) {
  //       throw new Error(
  //         "Could not find Name and Roll Number columns. Please use headers like Candidate Name and Roll No."
  //       );
  //     }

  //     // Read every PDF in the selected folder.
  //     const pdfRecords = [];

  //     for await (const entry of folderHandle.values()) {
  //       if (
  //         entry.kind === "file" &&
  //         entry.name.toLowerCase().endsWith(".pdf")
  //       ) {
  //         setProgress(`Reading ${entry.name}`);

  //         const file = await entry.getFile();
  //         const text = await readPdf(file);

  //         pdfRecords.push({
  //           fileName: entry.name,
  //           text,
  //           normalizedText: normalize(text),
  //           rollNumbers: extractRollNumbers(text),
  //         });
  //       }
  //     }

  //     if (!pdfRecords.length) {
  //       throw new Error("No PDF files found in the selected folder.");
  //     }

  //     // Compare candidate names with PDF text.
  //     const output = rows.map((row) => {
  //       const name = String(row[nameColumn]).trim();
  //       const excelRoll = String(row[rollColumn]).trim();
  //       const normalizedName = normalize(name);

  //       const matches = pdfRecords.filter((pdf) =>
  //         pdf.normalizedText.includes(normalizedName)
  //       );

  //       if (!name || !excelRoll) {
  //         return {
  //           name,
  //           excelRoll,
  //           pdfRoll: "",
  //           file: "",
  //           status: "Incomplete Excel record",
  //         };
  //       }

  //       if (matches.length === 0) {
  //         return {
  //           name,
  //           excelRoll,
  //           pdfRoll: "",
  //           file: "",
  //           status: "Candidate not found",
  //         };
  //       }

  //       if (matches.length > 1) {
  //         return {
  //           name,
  //           excelRoll,
  //           pdfRoll: "",
  //           file: matches.map((m) => m.fileName).join(", "),
  //           status: "Multiple PDF matches",
  //         };
  //       }

  //       const match = matches[0];

  //       // Identify the roll number closest to the candidate name.
  //       const index = match.normalizedText.indexOf(normalizedName);

  //       const nearbyText = match.text.slice(
  //         Math.max(0, index - 150),
  //         index + name.length + 250
  //       );

  //       const nearbyRolls = extractRollNumbers(nearbyText);

  //       const pdfRoll =
  //         nearbyRolls.length === 1
  //           ? nearbyRolls[0]
  //           : match.rollNumbers.length === 1
  //             ? match.rollNumbers[0]
  //             : "";

  //       let status = "Needs manual review";

  //       if (pdfRoll) {
  //         status =
  //           normalize(excelRoll) === normalize(pdfRoll)
  //             ? "Correct"
  //             : "Mismatch";
  //       }

  //       return {
  //         name,
  //         excelRoll,
  //         pdfRoll,
  //         file: match.fileName,
  //         status,
  //       };
  //     });

  //     setResults(output);
  //     setProgress(`Scanned ${pdfRecords.length} PDF files.`);
  //   } catch (err) {
  //     setError(err.message || "An error occurred during scanning.");
  //   } finally {
  //     setLoading(false);
  //   }
  // }


  async function scanFiles() {
    if (!excelFile || !folderHandle) {
      setError("Please select an Excel file and a PDF folder.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setShowResults(false);

    try {
      // Read Excel file
      const buffer = await excelFile.arrayBuffer();

      const workbook = XLSX.read(buffer, {
        type: "array",
        raw: false,
      });

      const sheet = workbook.Sheets[workbook.SheetNames[0]];

      const rows = XLSX.utils.sheet_to_json(sheet, {
        defval: "",
        raw: false,
      });

      if (!rows.length) {
        throw new Error("The Excel sheet is empty.");
      }

      // Find the roll number column
      const headers = Object.keys(rows[0]);

      const rollColumn = headers.find((h) =>
        /roll.?no|roll.?number|rollno|rollnumber/i.test(h)
      );

      const nameColumn = headers.find((h) =>
        /candidate.?name|student.?name|name/i.test(h)
      );

      if (!rollColumn) {
        throw new Error("Roll Number column not found in Excel.");
      }

      // Extract roll numbers from PDF filenames
      const pdfRollNumbers = new Set();
      const pdfFiles = [];

      for await (const entry of folderHandle.values()) {
        if (
          entry.kind === "file" &&
          entry.name.toLowerCase().endsWith(".pdf")
        ) {
          const fileName = entry.name;

          // Extract the roll number from the filename
          const rollMatch = fileName.match(/\d{12}/);

          if (rollMatch) {
            pdfRollNumbers.add(rollMatch[0]);
            pdfFiles.push(fileName);
          }
        }
      }

      if (pdfFiles.length === 0) {
        throw new Error(
          "No PDF files with valid roll numbers were found."
        );
      }

      // Compare Excel roll numbers with PDF filenames
      const output = rows.map((row) => {
        const excelRoll = String(row[rollColumn] ?? "")
          .trim()
          .replace(/\.0$/, "");

        const name = nameColumn
          ? String(row[nameColumn] ?? "").trim()
          : "";

        const isMatched = pdfRollNumbers.has(excelRoll);

        return {
          name,
          excelRoll,
          pdfRoll: isMatched ? excelRoll : "",
          file: isMatched
            ? `${excelRoll}.pdf`
            : "",
          status: isMatched ? "Matched" : "Mismatched",
        };
      });

      setResults(output);

      setProgress(
        `Scanned ${pdfFiles.length} PDF files. ` +
        `${output.filter((r) => r.status === "Matched").length} matched, ` +
        `${output.filter((r) => r.status === "Mismatched").length} mismatched.`
      );
    } catch (err) {
      setError(err.message || "An error occurred during scanning.");
    } finally {
      setLoading(false);
    }
  }

  function exportReport() {
    const worksheet = XLSX.utils.json_to_sheet(results);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Verification Report"
    );

    XLSX.writeFile(workbook, "roll-number-report.xlsx");
  }

  // const mismatches = results.filter(
  //   (r) => r.status === "Mismatch"
  // ).length;

  const mismatches = results.filter(
    (r) => r.status === "Mismatched"
  ).length;

  return (
    <main className="app">
      <header className="header">
        <div>
          <h1>Roll Number Verifier</h1>
          <p>
            Compare candidate records in Excel against your PDF
            collection.
          </p>
        </div>
      </header>

      <section className="upload-grid">
        <div className="upload-card">
          <h2>1. Upload Excel</h2>
          <p>Select the candidate list.</p>

          <label className="upload-button">
            Choose Excel File
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                setExcelFile(e.target.files?.[0] || null);
                setResults([]);
              }}
              hidden
            />
          </label>

          <p className="file-name">
            {excelFile?.name || "No file selected"}
          </p>
        </div>

        <div className="upload-card">
          <h2>2. Select PDF Folder</h2>
          <p>Choose the folder containing candidate PDFs.</p>

          <button
            className="upload-button"
            onClick={chooseFolder}
          >
            <span>📁</span> Choose Folder
          </button>

          <p className="file-name">
            {folderName || "No folder selected"}
          </p>
        </div>
      </section>

      <button
        className="scan-button"
        disabled={!excelFile || !folderHandle || loading}
        onClick={scanFiles}
      >
        {loading ? "Scanning PDFs..." : "Start Verification"}
      </button>

      {progress && <p className="progress">{progress}</p>}
      {error && <p className="error">{error}</p>}

      {results.length > 0 && (
        <section className="results">
          <div className="results-header">
            <div>
              <h2>Verification Results</h2>
              <p>{results.length} candidate records checked</p>
            </div>

            {/* <button
              className="export-button"
              onClick={exportReport}
            >
              Export Excel
            </button> */}

            <div className="results-actions">
              <button
                className="export-button"
                onClick={exportReport}
              >
                Export Excel
              </button>

              <button
                className="export-button"
                onClick={() => setShowResults(!showResults)}
              >
                {showResults ? "Hide Candidate Details" : "Missing Files"}
              </button>
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <span>Total</span>
              <strong>{results.length}</strong>
            </div>

            <div className="stat">
              <span>Correct</span>
              <strong>
                {results.filter((r) => r.status === "Matched").length}
              </strong>
            </div>

            <div className="stat">
              <span>Mismatches</span>
              <strong>{mismatches}</strong>
            </div>

            <div className="stat">
              <span>Needs Review</span>
              <strong>
                {/* {results.filter(
                  (r) => r.status !== "Correct" && r.status !== "Mismatch"
                ).length} */}

                {results.filter(
                  (r) => r.status !== "Matched" && r.status !== "Mismatched"
                ).length}

              </strong>
            </div>
          </div>

          {/* <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate Name</th>
                  <th>Excel Roll No.</th>
                  <th>PDF Roll No.</th>
                  <th>PDF File</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {results.map((row, index) => (
                  <tr key={index}>
                    <td>{row.name}</td>
                    <td>{row.excelRoll}</td>
                    <td>{row.pdfRoll || "—"}</td>
                    <td>{row.file || "—"}</td>
                    <td>
                      <span
                        className={`status ${row.status
                          .toLowerCase()
                          .replaceAll(" ", "-")}`}
                      >
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div> */}

          {showResults && (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Candidate Name</th>
                    <th>Excel Roll No.</th>
                    <th>PDF Roll No.</th>
                    <th>PDF File</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {results
                    .filter((row) => row.status === "Matched")
                    .map((row, index) => (
                      <tr key={index}>
                        <td>{row.name}</td>
                        <td>{row.excelRoll}</td>
                        <td>{row.pdfRoll || "—"}</td>
                        <td>{row.file || "—"}</td>
                        <td>
                          <span
                            className={`status ${row.status
                              .toLowerCase()
                              .replaceAll(" ", "-")}`}
                          >
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;