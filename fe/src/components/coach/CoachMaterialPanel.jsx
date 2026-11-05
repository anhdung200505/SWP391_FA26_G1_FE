import { useEffect, useState } from 'react';
import { listCourseMaterials } from '../../api/courseMaterialApi';
import CourseMaterialView from '../course/CourseMaterialView';

export default function CoachMaterialPanel({ sportName }) {
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let ignore = false;
    listCourseMaterials()
      .then((rows) => {
        if (ignore) return;
        const list = Array.isArray(rows) ? rows : [];
        setMaterial(list.find((item) => item.sportName === sportName) || null);
      })
      .catch((loadError) => {
        if (!ignore) setError(loadError.message);
      });
    return () => {
      ignore = true;
    };
  }, [sportName]);

  if (error) return <p className="text-sm font-semibold text-[#b1131a]">{error}</p>;
  return <CourseMaterialView material={material} />;
}
