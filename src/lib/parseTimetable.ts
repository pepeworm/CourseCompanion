/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-unsafe-optional-chaining */

import {
  durationTextToSemesterNumber,
  getBlockFromPeriod,
  getNumBlocks,
  getPeriodFromTimeString,
  SUBJKEY,
} from './osa';

const HAS_ROOM_AND_TEACHER = false;

/* eslint-disable no-console */
const SAMPLE = `
Timetable for Oliver Chen at Old Scona School
February 2022
Day 01
Time Room Course Teacher Course Duration
8:25 AM - 9:55 AM 003 Social Studies 10-1 (IB) James Kosowan Sep 2 - Jun 28
12:15 PM - 1:45 PM 212 English Language Arts 10-1 (IB) Gurpreet Virdi /
Sabrina Lee Sep 2 - Jun 28
1:50 PM - 3:20 PM 103 Mathematics 20-1 (IB) Shawn Gan Jan 29 - Jun 28
Day 02
Time Room Course Teacher Course Duration
10:00 AM - 11:30 AM 200 Science 10 (IB) Alfred Ye Sep 2 - Jun 28
12:15 PM - 1:45 PM 100 Introductory Computing Science
(IB) Shawn Gan Sep 2 - Jun 28
1:50 PM - 3:20 PM 103 Mathematics 20-1 (IB) Shawn Gan Jan 29 - Jun 28
Day 03
Time Room Course Teacher Course Duration
8:25 AM - 9:55 AM 003 Social Studies 10-1 (IB) James Kosowan Sep 2 - Jun 28
12:15 PM - 1:45 PM 212 English Language Arts 10-1 (IB) Gurpreet Virdi /
Sabrina Lee Sep 2 - Jun 28
1:50 PM - 3:20 PM 100 French-9Y 10 (IB) Heather Taschuk Sep 2 - Jun 28
Day 04
Time Room Course Teacher Course Duration
12:15 PM - 1:45 PM 100 Introductory Computing Science
(IB) Shawn Gan Sep 2 - Jun 28
1:50 PM - 3:20 PM 103 Mathematics 20-1 (IB) Shawn Gan Jan 29 - Jun 28
Day 05
Time Room Course Teacher Course Duration
8:25 AM - 9:55 AM 200 Science 10 (IB) Alfred Ye Sep 2 - Jun 28
12:15 PM - 1:45 PM 103 Mathematics 20-1 (IB) Shawn Gan Jan 29 - Jun 28
1:50 PM - 3:20 PM 100 French-9Y 10 (IB) Heather Taschuk Sep 2 - Jun 28
`;

export type ICourse = {
  name: string;
  code: string;
  teacher: {
    name: string;
    initials: string;
  } | null;
  room: string | null;
  duration: number | null;
};

function parseTimetable(content: string) {
  const lines = content
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (!lines.length) {
    throw new Error('Empty timetable');
  }

  // Parse the header.
  if (lines.length < 2) {
    throw new Error("Your timetable doesn't have a header");
  }
  const [name, school] = lines
    .shift()
    ?.match(/^Timetable for (.+) at (.+)$/)!
    ?.slice(1);
  if (!name || !school) {
    throw new Error("Your timetable doesn't have a header");
  }
  console.log('Name:', name);
  console.log('School:', school);
  const timePeriod = lines.shift()?.trim();
  if (
    !timePeriod ||
    !/^(Janurary|February|March|April|May|June|July|August|September|October|November|December) \d{4}$/.test(
      timePeriod
    )
  ) {
    throw new Error(
      "Your timetable doesn't have a valid date line (eg. February 2023). Usually, this should be the second line of your timetable."
    );
  }
  console.log('Date:', timePeriod);

  // Parse the timetable.
  const day2linenum = new Map<number, number>();
  lines.forEach((line, index) => {
    if (/^Day (\d+)$/.test(line)) {
      const day = parseInt(line.match(/^Day (\d+)$/)![1] || '-1', 10);
      if (!day2linenum.get(day)) {
        day2linenum.set(day, index);
      }
    }
  });
  console.log('Days:', day2linenum);
  for (let day = 1; day <= 5; day++) {
    if (day2linenum.get(day) === undefined) {
      throw new Error(`Your timetable doesn't have a day ${day}`);
    }
  }
  Array.from(day2linenum.keys()).forEach((day) => {
    if (day < 1 || day > 5) {
      throw new Error(`Your timetable has an extraneous day ${day}`);
    }
  });

  const day2lines = new Map<number, string[]>();
  Array.from(day2linenum.keys()).forEach((day) => {
    const start = day2linenum.get(day)! + 2;
    const end = day2linenum.get(day + 1) || lines.length;
    day2lines.set(day, lines.slice(start, end));
  });

  const blocks: ICourse[] = new Array(getNumBlocks()).fill(null).map(() => ({
    name: 'Spare',
    code: 'SPARE',
    teacher: null,
    room: null,
    duration: null,
  }));

  day2lines.forEach((day, did) => {
    const dayContent = day.join(' ');
    const dayContentLines = dayContent
      .split(/( |^)(?=\d\d?:\d\d(?: [AP]M)? - \d\d?:\d\d(?: [AP]M)?)/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    dayContentLines.forEach((line) => {
      const period = getPeriodFromTimeString(
        line.match(/^\d\d?:\d\d? [AP]M - \d\d?:\d\d? [AP]M/)![0] || ''
      );
      line =
        line
          .split(/^\d\d?:\d\d(?: [AP]M)? - \d\d?:\d\d(?: [AP]M)?/)[1]
          ?.trim() || '';
      let room;
      if (HAS_ROOM_AND_TEACHER) {
        room = line.split(' ')[0];
        line = line.split(' ').slice(1).join(' ');
      } else {
        room = '[UNK]';
      }
      const duration =
        line
          .match(
            / ((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2} - (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{1,2})$/
          )![1]
          ?.trim() || '';
      line = line.split(duration)[0]?.trim() || '';
      // Now the line is the course name and teacher.
      // Loop over the valid course names and attempt to extract the course name from the line.
      let courseName;
      let courseCode;
      let teacher;
      let teacherInitials;
      Object.entries(SUBJKEY).every(([name_, code_]) => {
        if (line.startsWith(name_)) {
          courseName = name_;
          courseCode = code_;
          if (HAS_ROOM_AND_TEACHER) {
            teacher = line.split(name_)?.[1]?.trim();
            teacherInitials = teacher?.match(/[A-Z]/g)?.join('') || '';
          } else {
            teacher = '[UNKNOWN]';
            teacherInitials = '[UNK]';
          }
          return false;
        }
        return true;
      });
      if (!courseName) {
        // throw new Error(`Could not extract course name from ${line}`);
        // This is a pretty common error, so we need to be lenient.
        courseName = line;
        courseCode = 'EDGE';
        teacher = '[UNKNOWN]';
      }
      console.log(
        `Day ${did} Period ${period}: ${courseCode} taught by ${teacherInitials} in Room ${room}`
      );

      // Store it in the blocks array.
      if (courseCode) {
        const thisBlock = getBlockFromPeriod(did, period) - 1;
        // Ensure the block is not already occupied.
        if (
          blocks[thisBlock]?.code !== 'SPARE' &&
          blocks[thisBlock]?.code !== courseCode
        ) {
          throw new Error(
            `Tried to occupy block ${thisBlock} with ${courseCode} ("${courseName}"), but it is already occupied by ${blocks[thisBlock]?.code} ("${blocks[thisBlock]?.name}"). Either there is a typo, a course we don't know about, or something is off with the blocks system.`
          );
        }
        blocks[thisBlock] = {
          name: courseName,
          code: courseCode,
          teacher: {
            name: teacher || '[UNKNOWN]',
            initials: teacherInitials || 'UNKNOWN',
          },
          room: room || '[UNKNOWN]',
          duration: durationTextToSemesterNumber(duration),
        };
      }
    });
  });

  return { name, school, timePeriod, blocks, content };
}

console.log(parseTimetable(SAMPLE));

export { parseTimetable };
