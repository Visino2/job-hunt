// Real questions reported for mobile/React Native screens run through AI
// recruiter interviews (e.g. micro1's "Zara"), pulled from micro1's own
// published interview-prep pages:
// https://www.micro1.ai/interview-prep/mobile-front-end-developer-interview-questions
// https://www.micro1.ai/interview-prep/react-developer-interview-questions
//
// Used to ground generateInterviewQuestions() with real, previously-asked
// questions instead of relying purely on the model's guess at what's likely.
export const KNOWN_MOBILE_REACT_NATIVE_QUESTIONS: string[] = [
  "What are the best practices for implementing responsive design in mobile front-end development?",
  "How do you effectively manage state in complex mobile applications?",
  "What are the key challenges in cross-platform mobile development and how do you overcome them?",
  "What techniques are useful for ensuring accessibility in mobile responsive interfaces?",
  "What advanced patterns allow scalable state management as an application grows?",
  "How do you optimize performance when building cross-platform apps?",
  "What strategies exist for handling device fragmentation in responsive mobile design?",
  "How do you implement seamless data synchronization across different platforms in a cross-platform application?",
  "What methods can ensure consistency in UI/UX across multiple platforms?",
  "What role does component reusability play in responsive design and cross-platform development?",
  "What are the key concepts in advanced JavaScript that a senior React developer should master?",
  "What are the different phases of the React component lifecycle and their use cases?",
  "What are the various approaches to managing state in large-scale React applications?",
  "What techniques do you use to optimize re-rendering in React components?",
  "What are the differences between controlled and uncontrolled components in React?",
  "What are the different ways to handle side effects in React applications?",
  "What are the advantages and limitations of using Redux for state management in React?",
  "What are the implications of improper state management on React component performance?",
];

// Keywords that flag a job description as a mobile / React Native role,
// where the known-question bank above is actually relevant.
const MOBILE_ROLE_KEYWORDS = ["react native", "mobile", "ios", "android", "cross-platform", "micro1"];

export function isMobileOrReactNativeRole(jobDescription: string): boolean {
  const text = jobDescription.toLowerCase();
  return MOBILE_ROLE_KEYWORDS.some((kw) => text.includes(kw));
}
