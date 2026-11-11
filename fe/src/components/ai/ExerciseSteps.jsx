// Tách nội dung bài tập của một buổi thành từng dòng: Khởi động, Bài chính 1..n, Giãn cơ, Lưu ý.
// Bài chính viết dạng "Tên | 4 hiệp | 12 lần mỗi hiệp | 3 giây mỗi lần | nghỉ 60 giây giữa các hiệp | nghỉ 90 giây rồi sang bài kế tiếp".
const LABEL = /(?=(?:Địa điểm|Khởi động|Bài chính(?:\s*\d+)?|Giãn cơ|Lưu ý)\s*:)/g;

export function splitExercises(text) {
  const parts = String(text || '')
    .split(LABEL)
    .map((part) => part.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const steps = [];
  let intro = '';
  parts.forEach((part, index) => {
    const match = part.match(/^([^:]{2,30}):\s*(.*)$/);
    if (match && /^(Địa điểm|Khởi động|Bài chính|Giãn cơ|Lưu ý)/.test(match[1])) {
      steps.push({ label: match[1], body: match[2].replace(/\.$/, '') });
    } else if (index === 0) {
      intro = part;
    } else {
      steps.push({ label: '', body: part });
    }
  });
  return { intro, steps };
}

function chipTone(text) {
  const value = text.toLowerCase();
  if (value.includes('nghỉ')) return 'bg-sky-100 text-sky-800';
  return 'bg-white text-gray-800 ring-1 ring-slate-200';
}

const number = (text, pattern) => {
  const match = String(text || '').match(pattern);
  return match ? Number(match[1]) : null;
};

// Trình tự thật của một bài chính: Hiệp 1 -> nghỉ -> Hiệp 2 ... -> Hiệp cuối -> nghỉ -> bài/phần kế tiếp.
function Sequence({ segments, nextLabel }) {
  const joined = segments.join(' | ');
  const sets = number(joined, /(\d+)\s*hiệp/i);
  const restBetween = number(segments.find((item) => /nghỉ/i.test(item) && /giữa/i.test(item)), /(\d+)\s*giây/i);
  const restAfter = number(segments.find((item) => /nghỉ/i.test(item) && !/giữa/i.test(item)), /(\d+)\s*giây/i);
  if (!sets || sets < 1) return null;
  const parts = [];
  if (sets === 1) {
    parts.push('Hiệp 1');
  } else if (sets === 2) {
    parts.push('Hiệp 1', restBetween ? `nghỉ ${restBetween} giây` : 'nghỉ', 'Hiệp 2');
  } else {
    parts.push('Hiệp 1', restBetween ? `nghỉ ${restBetween} giây` : 'nghỉ', 'Hiệp 2', '…', `Hiệp ${sets}`);
  }
  parts.push(restAfter ? `nghỉ ${restAfter} giây` : 'nghỉ', nextLabel);
  return (
    <span className="mt-1.5 block text-xs font-semibold text-slate-600">
      Trình tự: {parts.join(' → ')}
    </span>
  );
}

export default function ExerciseSteps({ text }) {
  const { intro, steps } = splitExercises(text);
  if (steps.length === 0) {
    return <p className="mt-2 text-sm text-pretty whitespace-pre-line text-gray-600">{text}</p>;
  }
  return (
    <div className="mt-2">
      {intro && <p className="text-xs font-bold text-slate-500">{intro.replace(/\.$/, '')}</p>}
      <p className="mt-2 text-xs font-semibold text-slate-500">
        Cách tập mỗi bài chính: tập đủ số lần của một hiệp, nghỉ theo thời gian ghi trên thẻ, rồi vào hiệp kế tiếp cho đến hết số hiệp. Chỉ sau hiệp cuối của bài chính cuối cùng mới chuyển sang giãn cơ, và giãn cơ chỉ làm một lần ở cuối buổi.
      </p>
      <ol className="mt-2 space-y-1.5">
        {steps.map((step, index) => {
          const segments = step.body.split('|').map((item) => item.trim()).filter(Boolean);
          const structured = step.label.startsWith('Bài chính') && segments.length > 1;
          const next = steps[index + 1];
          const nextName = next ? next.body.split('|')[0].trim() : '';
          return (
            <li
              key={`${step.label}-${index}`}
              className={`rounded-xl px-3 py-2 text-sm text-pretty text-gray-700 ${
                step.label.startsWith('Lưu ý') ? 'bg-amber-50' : step.label.startsWith('Địa điểm') ? 'bg-emerald-50' : 'bg-slate-50'
              }`}
            >
              {step.label && <span className="font-black text-gray-900">{step.label}: </span>}
              {structured ? (
                <>
                  <span className="font-bold text-gray-900">{segments[0]}</span>
                  <span className="mt-1.5 flex flex-wrap gap-1.5">
                    {[...new Set(segments.slice(1))].map((segment) => (
                      <span key={segment} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${chipTone(segment)}`}>
                        {segment}
                      </span>
                    ))}
                  </span>
                  <Sequence segments={segments.slice(1)} nextLabel={next ? `${next.label}${nextName ? ` – ${nextName}` : ''}` : 'kết thúc'} />
                </>
              ) : (
                step.body
              )}
              {step.label.startsWith('Bài chính') && !structured && (
                <span className="mt-1 block text-xs font-semibold text-slate-400">
                  Gợi ý cũ chưa ghi thời gian nghỉ. Bấm tạo lại để AI bổ sung đủ thời gian nghỉ.
                </span>
              )}
              {next && !next.label.startsWith('Lưu ý') && step.label !== 'Lưu ý' && (
                <span className="mt-1.5 block text-xs font-bold text-slate-500">
                  Tiếp theo: {next.label}{nextName ? ` – ${nextName}` : ''}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
