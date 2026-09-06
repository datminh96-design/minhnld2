const d = new Date('2026-09-06T12:00:00Z'); // Mock Sunday
const day = d.getDay(); // 0
const diffToMonday = day === 0 ? -6 : 1 - day; // -6
const start = new Date(d);
start.setDate(d.getDate() + diffToMonday);
const end = new Date(start);
end.setDate(start.getDate() + 6);

const format = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
console.log("start:", format(start));
console.log("end:", format(end));
