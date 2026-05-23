---
inclusion: always
---

# Product: Interview Prep 
A client-side web app that helps job seekers practice mock interviews. Users log in, set up a profile with their target role and experience level, then work through a set of interview questions one at a time. After completing a session, they receive per-question scores and feedback, plus an overall performance summary.


## Purpose
A learning app built by interns to practice spec-driven development 
with AWS Kiro. The app helps users prepare for job interviews by 
practicing questions, receiving AI-powered feedback, and tracking 
improvement over time.


## Context

•⁠  ⁠Solo workspace — no team collaboration or CI/CD pipeline
•⁠  ⁠Problems sourced from LeetCode, HackerRank, Blind 75, NeetCode, etc.
•⁠  ⁠Solutions should prioritize clarity and learning over brevity
•⁠  ⁠Notes are for personal reference; write them to be re-readable weeks later

## Core User Flow

1.⁠ ⁠Login / Sign-up — simple email + password stored in SQlite
2.⁠ ⁠Profile — user sets name, target role, experience level, and number of questions; past session scores are shown here
3.⁠ ⁠Interview — questions are presented one at a time; user types or speaks their answer via the Web Speech API
4.⁠ ⁠Results — each answer is scored and given feedback; an overall summary is generated.

## Key Features
1. Auth — basic login and signup
2. Profile info — user sets up their name and role
3. Mock interview session — 3 randomised questions shown 
   one at a time, user types answer and moves to next
4. AI feedback — Ollama (Llama 3.2) evaluates each answer
5. Results page — qualitative analysis with score out of 10
6. Progress tracking — history of past sessions and scores

## User Flow
Login → Profile Info → Start Interview → 
Question 1 → Question 2 → Question 3 → Results Page


## Problem We're Solving
Candidates preparing for interviews have no structured way to practice 
answers and get objective feedback. This app fills that gap with an 
AI feedback loop.

## Tech Boundaries
•⁠  ⁠Frontend: React.js with Vite, runs on localhost
•⁠  ⁠API: REST API
•⁠  ⁠AI Feedback: Open source free model (to be decided)
•⁠  ⁠Database: SQLite
•⁠  ⁠Auth: Basic authentication (simplest available)

## Out of Scope (for this version)
- No question browsing page
•⁠  ⁠No complex authentication — basic login onlyp
•⁠  ⁠No mobile app — web only
•⁠  ⁠No real-time video or audio interviews
•⁠  ⁠No cloud deployment — runs locally only