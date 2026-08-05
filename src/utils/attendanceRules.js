export function calculateAttendanceStatus(date) {
  const minutes = date.getHours() * 60 + date.getMinutes();
  const thursday = date.getDay() === 4;
  const scheduled = thursday ? 600 : 540;
  const veryLate = scheduled + 30;
  const absent = thursday ? 660 : 600;
  if (minutes >= absent) return 'Absent';
  if (minutes > veryLate) return 'Very Late';
  if (minutes >= scheduled) return 'Late';
  return 'Present';
}
