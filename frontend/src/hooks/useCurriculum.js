import { useEffect, useState } from "react";
import { careerApi } from "../services/api";
// Public curriculum only. Never cache CV, tokens, candidate or interview data.
let cached = null;
let pending = null;
export const resetCurriculumCache = () => {
  cached = null;
  pending = null;
};
function refresh() {
  if (!pending)
    pending = careerApi
      .getCurriculum()
      .then((value) => {
        cached = value.courses;
        return cached;
      })
      .finally(() => {
        pending = null;
      });
  return pending;
}
export function useCurriculum() {
  const [courses, setCourses] = useState(cached || []),
    [loading, setLoading] = useState(cached === null),
    [refreshing, setRefreshing] = useState(false),
    [error, setError] = useState(null),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    const run = () => {
      if (document.visibilityState === "hidden") return;
      setRefreshing(true);
      setError(null);
      refresh()
        .then((data) => {
          if (alive) setCourses(data);
        })
        .catch((e) => {
          if (alive) setError(e);
        })
        .finally(() => {
          if (alive) {
            setLoading(false);
            setRefreshing(false);
          }
        });
    };
    run();
    window.addEventListener("focus", run);
    window.addEventListener("online", run);
    document.addEventListener("visibilitychange", run);
    return () => {
      alive = false;
      window.removeEventListener("focus", run);
      window.removeEventListener("online", run);
      document.removeEventListener("visibilitychange", run);
    };
  }, [revision]);
  return {
    courses,
    loading,
    refreshing,
    error,
    retry: () => setRevision((v) => v + 1),
  };
}
