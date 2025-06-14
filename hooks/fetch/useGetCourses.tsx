import type { CourseType } from "@/types/course"; // optional if you use global types
import { useEffect, useState } from "react";

const useGetCourses = () => {
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        // Simulate loading delay
        await new Promise((resolve) => setTimeout(resolve, 800));

        const data = require("@/assets/mockCourses.json"); // Load local JSON
        setCourses(data.courses);
        setLoading(false);
      } catch (err: any) {
        setError("Failed to load courses");
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  return { courses, loading, error };
};

export default useGetCourses;
