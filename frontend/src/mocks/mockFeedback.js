export const mockQuestion = 'Tell me about yourself.'

export const mockTranscript =
  "Um, basically I'm a computer science student and like I've worked on a few projects. I basically enjoy building products, but um sometimes I struggle to structure my thoughts. Like, I've done internships and basically learned a lot about teamwork."

export const fillerWords = ['basically', 'um', 'like']

export function buildMockFeedback() {
  return {
    scores: {
      Structure: 4,
      Communication: 6,
      Confidence: 5,
    },
    transcript: mockTranscript,
    brutal: [
      "You said 'basically' 11 times.",
      'Your answer lacked structure.',
      'Weak opening statement.',
    ],
    tips: ['Use STAR method', 'Start with a strong summary', 'Avoid filler words'],
  }
}

