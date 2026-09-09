import {mealInterviewComplete,mealQuestionKeys,type MealInterview} from './meal-interview.ts';

export function mealSummaryScreen(value:MealInterview) {
  return (value.mealType?mealQuestionKeys(value.mealType).length:0)+2;
}
export function initialMealScreen(value:MealInterview) {
  return mealInterviewComplete(value)?mealSummaryScreen(value):value.mealType?1:0;
}
export function nextMealScreen(value:MealInterview,screen:number,editing:boolean) {
  return editing&&mealInterviewComplete(value)?mealSummaryScreen(value):screen+1;
}
export function mealReadyForSave(value:MealInterview,screen:number) {
  return mealInterviewComplete(value)&&screen===mealSummaryScreen(value);
}
