import { useEffect, useState } from "react";
import axios from "axios";
import "./asma.css";

interface Asma {
  number: number;
  name: string;
  transliteration: string;
  en: { meaning: string };
}

const AsmaPage: React.FC = () => {
  const [names, setNames] = useState<Asma[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const fetchNames = async () => {
      try {
        const res = await axios.get("https://api.aladhan.com/v1/asmaAlHusna", {
          signal: controller.signal,
          timeout: 15000,
        });
        if (!Array.isArray(res.data.data) || !res.data.data.length) {
          throw new Error("No names returned");
        }
        setNames(res.data.data as Asma[]);
      } catch {
        if (!controller.signal.aborted) {
          setError("The names could not be loaded. Please try again.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void fetchNames();
    return () => controller.abort();
  }, [attempt]);

  return (
    <section className="asma-content" aria-label="The 99 beautiful names of Allah" aria-busy={loading}>
      {loading ? (
        <>
          <p className="asma-status" role="status">Loading the beautiful names of Allah…</p>
          <div className="asma-grid" aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <div className="asma-card asma-skeleton" key={index}><span /><span /><span /></div>
            ))}
          </div>
        </>
      ) : error ? (
        <div className="asma-error" role="alert">
          <p>{error}</p>
          <button className="outline-button" onClick={() => {
            setError("");
            setLoading(true);
            setAttempt((value) => value + 1);
          }}>Try again</button>
        </div>
      ) : (
        <>
          <div className="asma-grid">
            {names.map((item) => (
              <article key={item.number} className="asma-card">
                <h2 className="asma-arabic" lang="ar" dir="rtl">{item.name}</h2>
                <p className="asma-name">{item.transliteration}</p>
                <p className="asma-meaning">{item.en.meaning}</p>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
};

export default AsmaPage;
