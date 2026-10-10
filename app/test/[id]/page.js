"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

export default function TestPage() {
  const { id } = useParams();
  const router = useRouter();

  const [test, setTest] = useState(null);
  const [examConfig, setExamConfig] = useState(null);
  const [sections, setSections] = useState([]);
  const [questions, setQuestions] = useState([]);

  const [answers, setAnswers] = useState({});
  const [review, setReview] = useState({});
  const [visited, setVisited] = useState({});

  const [current, setCurrent] = useState(0);

  const [activeSection, setActiveSection] = useState(0);
  const [paletteSection, setPaletteSection] = useState(0);

  const [timeLeft, setTimeLeft] = useState(null);

  const [language, setLanguage] = useState("english");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [changingSection, setChangingSection] = useState(false);
  const [saving, setSaving] = useState(false);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [error, setError] = useState("");

  const autoSubmitting = useRef(false);
  const refreshingState = useRef(false);
  const questionScrollRef = useRef(null);
  const saveQueues = useRef({});

  const answerKey = `jd_answers_${id}`;
  const reviewKey = `jd_review_${id}`;
  const visitedKey = `jd_visited_${id}`;
  const languageKey = `jd_language_${id}`;

  useEffect(() => {
    loadTest();
  }, [id]);

  async function loadTest() {
    setLoading(true);
    setError("");

    const client = supabase();

    let localAnswers = {};
    let localReview = {};
    let localVisited = {};

    try {
      const savedLanguage =
        localStorage.getItem(languageKey);

      if (
        savedLanguage === "english" ||
        savedLanguage === "hindi"
      ) {
        setLanguage(savedLanguage);
      }

      const oldAnswers =
        localStorage.getItem(answerKey);

      const oldReview =
        localStorage.getItem(reviewKey);

      const oldVisited =
        localStorage.getItem(visitedKey);

      if (oldAnswers) {
        localAnswers =
          JSON.parse(oldAnswers) || {};
      }

      if (oldReview) {
        localReview =
          JSON.parse(oldReview) || {};
      }

      if (oldVisited) {
        localVisited =
          JSON.parse(oldVisited) || {};
      }
    } catch {
      localAnswers = {};
      localReview = {};
      localVisited = {};
    }

    setAnswers(localAnswers);
    setReview(localReview);
    setVisited(localVisited);

    /*
      ---------------------------------------------------
      TEST BASIC DATA
      ---------------------------------------------------
    */

    const {
      data: testData,
      error: testError,
    } = await client
      .from("tests")
      .select("*")
      .eq("id", id)
      .single();

    if (testError) {
      setError(testError.message);
      setLoading(false);
      return;
    }

    setTest(testData);

    /*
      ---------------------------------------------------
      DYNAMIC EXAM CONFIG
      ---------------------------------------------------
    */

    const {
      data: configData,
      error: configError,
    } = await client.rpc(
      "get_test_exam_config",
      {
        p_test_id: Number(id),
      }
    );

    if (configError) {
      setError(configError.message);
      setLoading(false);
      return;
    }

    setExamConfig(configData);

    /*
      ---------------------------------------------------
      QUESTIONS
      ---------------------------------------------------
    */

    const {
      data: questionData,
      error: questionError,
    } = await client
      .from("test_questions")
      .select(`
        question_order,
        question_id,
        questions (
          id,
          question_text,
          question_text_hi,
          option_a,
          option_a_hi,
          option_b,
          option_b_hi,
          option_c,
          option_c_hi,
          option_d,
          option_d_hi
        )
      `)
      .eq("test_id", id)
      .order("question_order", {
        ascending: true,
      });

    if (questionError) {
      setError(questionError.message);
      setLoading(false);
      return;
    }

    const loadedQuestions =
      questionData || [];

    setQuestions(loadedQuestions);

    /*
      Convert DB sections into frontend ranges.

      अगर official configuration में section-wise
      fixed question count उपलब्ध नहीं है, तो engine
      automatically Full Paper mode use करेगा.
    */

    const normalizedSections =
      normalizeSections(
        configData?.sections || [],
        loadedQuestions.length,
        configData
      );

    setSections(normalizedSections);

    /*
      ---------------------------------------------------
      SERVER TIMER / ATTEMPT STATE
      ---------------------------------------------------
    */

    const {
      data: stateData,
      error: stateError,
    } = await client.rpc(
      "get_test_state",
      {
        p_test_id: Number(id),
      }
    );

    if (stateError) {
      setError(stateError.message);
      setLoading(false);
      return;
    }

    if (
      stateData?.status ===
      "submitted"
    ) {
      router.replace(
        `/result/${id}`
      );
      return;
    }

    const timerType =
      stateData?.timer_type ||
      configData?.stage?.timer_type ||
      "overall";

    const serverSection =
      Number(
        stateData?.current_section ?? 0
      );

    const remaining =
      Number(
        stateData?.remaining_seconds ?? 0
      );

    setTimeLeft(remaining);

    let initialQuestion = 0;

    if (
      timerType === "sectional" &&
      normalizedSections.length
    ) {
      const safeSection =
        Math.min(
          Math.max(serverSection, 0),
          normalizedSections.length - 1
        );

      setActiveSection(
        safeSection
      );

      setPaletteSection(
        safeSection
      );

      initialQuestion =
        normalizedSections[
          safeSection
        ].startIndex;
    } else {
      setActiveSection(0);
      setPaletteSection(0);
      initialQuestion = 0;
    }

    setCurrent(
      initialQuestion
    );

    const firstQ =
      loadedQuestions[
        initialQuestion
      ]?.questions;

    if (firstQ?.id) {
      markVisited(firstQ.id);
    }

    /*
      ---------------------------------------------------
      RESTORE SERVER ANSWERS
      ---------------------------------------------------
    */

    const {
      data: savedResponses,
      error: savedError,
    } = await client.rpc(
      "get_saved_test_responses",
      {
        p_test_id: Number(id),
      }
    );

    if (
      !savedError &&
      savedResponses
    ) {
      const mergedAnswers = {
        ...localAnswers,
      };

      const mergedReview = {
        ...localReview,
      };

      savedResponses.forEach(
        (row) => {
          const qid =
            String(row.question_id);

          if (
            row.selected_answer
          ) {
            mergedAnswers[qid] =
              row.selected_answer;
          } else {
            delete mergedAnswers[
              qid
            ];
          }

          mergedReview[qid] =
            Boolean(
              row.marked_for_review
            );
        }
      );

      setAnswers(
        mergedAnswers
      );

      setReview(
        mergedReview
      );

      try {
        localStorage.setItem(
          answerKey,
          JSON.stringify(
            mergedAnswers
          )
        );

        localStorage.setItem(
          reviewKey,
          JSON.stringify(
            mergedReview
          )
        );
      } catch {
        // Ignore
      }
    }

    setLoading(false);
  }

  /*
    =====================================================
    TIMER
    =====================================================
  */

  useEffect(() => {
    if (
      loading ||
      timeLeft === null ||
      submitting ||
      changingSection
    ) {
      return;
    }

    if (timeLeft <= 0) {
      refreshServerState();
      return;
    }

    const timer =
      setTimeout(() => {
        setTimeLeft(
          (old) =>
            Math.max(
              0,
              old - 1
            )
        );
      }, 1000);

    return () =>
      clearTimeout(timer);
  }, [
    timeLeft,
    loading,
    submitting,
    changingSection,
  ]);

  /*
    Server sync every 30 seconds
  */

  useEffect(() => {
    if (loading) return;

    const syncTimer =
      setInterval(() => {
        refreshServerState(
          false
        );
      }, 30000);

    return () =>
      clearInterval(
        syncTimer
      );
  }, [
    loading,
    activeSection,
  ]);

  async function refreshServerState(
    moveQuestion = true
  ) {
    if (
      refreshingState.current
    ) {
      return;
    }

    refreshingState.current =
      true;

    const {
      data,
      error,
    } = await supabase().rpc(
      "get_test_state",
      {
        p_test_id:
          Number(id),
      }
    );

    refreshingState.current =
      false;

    if (error) {
      setError(
        error.message
      );
      return;
    }

    if (
      data?.status ===
      "submitted"
    ) {
      router.replace(
        `/result/${id}`
      );
      return;
    }

    const expired =
      Boolean(
        data?.expired
      );

    setTimeLeft(
      Number(
        data?.remaining_seconds ??
          0
      )
    );

    /*
      Overall timer expiry:
      entire paper auto submits.

      Sectional timer:
      backend only returns expired=true
      when final section is over.
    */

    if (expired) {
      if (
        !autoSubmitting.current
      ) {
        autoSubmitting.current =
          true;

        submitTest(true);
      }

      return;
    }

    /*
      Sectional exam only:
      server may have automatically
      advanced the section.
    */

    if (
      data?.timer_type ===
      "sectional"
    ) {
      const serverSection =
        Number(
          data?.current_section ?? 0
        );

      const sectionChanged =
        serverSection !==
        activeSection;

      setActiveSection(
        serverSection
      );

      setPaletteSection(
        serverSection
      );

      if (
        sectionChanged &&
        moveQuestion &&
        sections[
          serverSection
        ]
      ) {
        const firstQuestion =
          sections[
            serverSection
          ].startIndex;

        setCurrent(
          firstQuestion
        );

        const q =
          questions[
            firstQuestion
          ]?.questions;

        if (q?.id) {
          markVisited(q.id);
        }

        scrollQuestionToTop();
      }
    }
  }

  /*
    =====================================================
    AUTOSAVE
    =====================================================
  */

  function queueServerSave(
    questionId,
    selectedAnswer,
    markedForReview
  ) {
    const key =
      String(questionId);

    const previous =
      saveQueues.current[
        key
      ] ||
      Promise.resolve();

    const next =
      previous
        .catch(() => {})
        .then(async () => {
          setSaving(true);

          const {
            error,
          } = await supabase().rpc(
            "save_test_response",
            {
              p_test_id:
                Number(id),

              p_question_id:
                Number(
                  questionId
                ),

              p_selected_answer:
                selectedAnswer ||
                null,

              p_marked_for_review:
                Boolean(
                  markedForReview
                ),
            }
          );

          if (error) {
            console.error(
              "Autosave error:",
              error
            );

            setError(
              "Answer locally saved है, लेकिन server autosave में समस्या आई।"
            );
          }
        })
        .finally(() => {
          if (
            saveQueues.current[
              key
            ] === next
          ) {
            delete saveQueues
              .current[
                key
              ];
          }

          if (
            Object.keys(
              saveQueues.current
            ).length === 0
          ) {
            setSaving(false);
          }
        });

    saveQueues.current[
      key
    ] = next;

    return next;
  }

  async function waitForPendingSaves() {
    const pending =
      Object.values(
        saveQueues.current
      );

    if (
      pending.length === 0
    ) {
      return;
    }

    await Promise.allSettled(
      pending
    );
  }

  /*
    =====================================================
    LANGUAGE
    =====================================================
  */

  function changeLanguage(
    value
  ) {
    if (
      value !== "english" &&
      value !== "hindi"
    ) {
      return;
    }

    setLanguage(value);

    try {
      localStorage.setItem(
        languageKey,
        value
      );
    } catch {
      // Ignore
    }

    scrollQuestionToTop();
  }

  /*
    =====================================================
    VISITED
    =====================================================
  */

  function markVisited(
    questionId
  ) {
    setVisited(
      (old) => {
        const updated = {
          ...old,
          [questionId]: true,
        };

        try {
          localStorage.setItem(
            visitedKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );
  }

  /*
    =====================================================
    SECTION HELPERS
    =====================================================
  */

  function getTimerType() {
    return (
      examConfig?.stage
        ?.timer_type ||
      "overall"
    );
  }

  function getSectionIndexForQuestion(
    questionIndex
  ) {
    const found =
      sections.findIndex(
        (section) =>
          questionIndex >=
            section.startIndex &&
          questionIndex <=
            section.endIndex
      );

    return found >= 0
      ? found
      : 0;
  }

  function getCurrentDisplaySection() {
    if (!sections.length) {
      return null;
    }

    if (
      getTimerType() ===
      "sectional"
    ) {
      return (
        sections[
          activeSection
        ] ||
        sections[0]
      );
    }

    return (
      sections[
        getSectionIndexForQuestion(
          current
        )
      ] ||
      sections[0]
    );
  }

  function canOpenQuestion(
    index
  ) {
    if (
      index < 0 ||
      index >=
        questions.length
    ) {
      return false;
    }

    if (
      getTimerType() !==
      "sectional"
    ) {
      return true;
    }

    const section =
      sections[
        activeSection
      ];

    if (!section) {
      return false;
    }

    return (
      index >=
        section.startIndex &&
      index <=
        section.endIndex
    );
  }

  /*
    =====================================================
    QUESTION NAVIGATION
    =====================================================
  */

  function goQuestion(
    index,
    closePalette = true
  ) {
    if (
      !canOpenQuestion(
        index
      )
    ) {
      return;
    }

    setCurrent(index);

    const q =
      questions[
        index
      ]?.questions;

    if (q?.id) {
      markVisited(q.id);
    }

    if (
      getTimerType() ===
      "overall"
    ) {
      const secIndex =
        getSectionIndexForQuestion(
          index
        );

      setPaletteSection(
        secIndex
      );
    }

    if (closePalette) {
      setPaletteOpen(false);
    }

    scrollQuestionToTop();
  }

  function goToSection(
    sectionIndex
  ) {
    if (
      !sections[
        sectionIndex
      ]
    ) {
      return;
    }

    /*
      Sectional exams:
      only current section accessible.
    */

    if (
      getTimerType() ===
        "sectional" &&
      sectionIndex !==
        activeSection
    ) {
      return;
    }

    setPaletteSection(
      sectionIndex
    );

    goQuestion(
      sections[
        sectionIndex
      ].startIndex,
      false
    );
  }

  function nextQuestion() {
    if (
      current >=
      questions.length - 1
    ) {
      return;
    }

    /*
      Sectional:
      cannot automatically enter
      next section.
    */

    if (
      getTimerType() ===
      "sectional"
    ) {
      const section =
        sections[
          activeSection
        ];

      if (
        !section ||
        current >=
          section.endIndex
      ) {
        return;
      }
    }

    goQuestion(
      current + 1
    );
  }

  /*
    =====================================================
    ANSWERS
    =====================================================
  */

  function selectAnswer(
    questionId,
    option
  ) {
    const currentReview =
      Boolean(
        review[
          questionId
        ]
      );

    setAnswers(
      (old) => {
        const updated = {
          ...old,
          [questionId]:
            option,
        };

        try {
          localStorage.setItem(
            answerKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );

    queueServerSave(
      questionId,
      option,
      currentReview
    );
  }

  function clearAnswer(
    questionId
  ) {
    const currentReview =
      Boolean(
        review[
          questionId
        ]
      );

    setAnswers(
      (old) => {
        const updated = {
          ...old,
        };

        delete updated[
          questionId
        ];

        try {
          localStorage.setItem(
            answerKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );

    queueServerSave(
      questionId,
      null,
      currentReview
    );
  }

  function markAndNext() {
    const q =
      questions[
        current
      ]?.questions;

    if (!q?.id) {
      return;
    }

    const selectedAnswer =
      answers[
        q.id
      ] || null;

    setReview(
      (old) => {
        const updated = {
          ...old,
          [q.id]: true,
        };

        try {
          localStorage.setItem(
            reviewKey,
            JSON.stringify(
              updated
            )
          );
        } catch {
          // Ignore
        }

        return updated;
      }
    );

    queueServerSave(
      q.id,
      selectedAnswer,
      true
    );

    nextQuestion();
  }

  /*
    =====================================================
    SECTION SUBMIT
    =====================================================
  */

  async function manualSubmitSection() {
    if (
      getTimerType() !==
      "sectional"
    ) {
      return;
    }

    if (
      changingSection ||
      submitting
    ) {
      return;
    }

    const section =
      sections[
        activeSection
      ];

    if (!section) {
      return;
    }

    /*
      Final section -> final test submit
    */

    if (
      activeSection >=
      sections.length - 1
    ) {
      submitTest(false);
      return;
    }

    const sectionQuestions =
      questions.slice(
        section.startIndex,
        section.endIndex + 1
      );

    const answered =
      sectionQuestions.filter(
        (item) =>
          answers[
            item.questions.id
          ]
      ).length;

    const unattempted =
      sectionQuestions.length -
      answered;

    const marked =
      sectionQuestions.filter(
        (item) =>
          review[
            item.questions.id
          ]
      ).length;

    const yes =
      window.confirm(
        `${section.sectionName} section submit करना चाहते हैं?\n\n` +
        `Attempted: ${answered}\n` +
        `Unattempted: ${unattempted}\n` +
        `Marked for Review: ${marked}\n\n` +
        `Submit करने के बाद इस section में वापस नहीं जा सकेंगे।`
      );

    if (!yes) {
      return;
    }

    setChangingSection(true);
    setError("");

    await waitForPendingSaves();

    const {
      data,
      error,
    } = await supabase().rpc(
      "submit_test_section",
      {
        p_test_id:
          Number(id),

        p_section:
          activeSection,
      }
    );

    if (error) {
      setChangingSection(false);

      setError(
        error.message
      );

      await refreshServerState();

      return;
    }

    if (
      data?.status ===
      "final_section"
    ) {
      setChangingSection(false);
      return;
    }

    const nextSection =
      Number(
        data?.current_section
      );

    setActiveSection(
      nextSection
    );

    setPaletteSection(
      nextSection
    );

    setTimeLeft(
      Number(
        data?.remaining_seconds ??
          0
      )
    );

    const nextSectionConfig =
      sections[
        nextSection
      ];

    if (
      nextSectionConfig
    ) {
      const firstQuestion =
        nextSectionConfig.startIndex;

      setCurrent(
        firstQuestion
      );

      const q =
        questions[
          firstQuestion
        ]?.questions;

      if (q?.id) {
        markVisited(q.id);
      }
    }

    setPaletteOpen(false);
    setChangingSection(false);

    scrollQuestionToTop();
  }

  /*
    =====================================================
    FINAL SUBMIT
    =====================================================
  */

  async function submitTest(
    automatic = false
  ) {
    if (submitting) {
      return;
    }

    if (!automatic) {
      const attempted =
        Object.keys(
          answers
        ).length;

      const unattempted =
        questions.length -
        attempted;

      const marked =
        Object.values(
          review
        ).filter(
          Boolean
        ).length;

      const yes =
        window.confirm(
          `क्या आप पूरा टेस्ट Submit करना चाहते हैं?\n\n` +
          `Attempted: ${attempted}\n` +
          `Unattempted: ${unattempted}\n` +
          `Marked for Review: ${marked}\n\n` +
          `Submit करने के बाद उत्तर बदले नहीं जा सकेंगे।`
        );

      if (!yes) {
        return;
      }
    }

    setSubmitting(true);
    setError("");

    await waitForPendingSaves();

    const {
      data,
      error,
    } = await supabase().rpc(
      "submit_test",
      {
        p_test_id:
          Number(id),

        p_answers:
          answers,

        p_review:
          review,
      }
    );

    if (error) {
      if (
        error.message
          ?.toLowerCase()
          .includes(
            "already submitted"
          )
      ) {
        router.replace(
          `/result/${id}`
        );

        return;
      }

      setError(
        error.message
      );

      setSubmitting(false);

      autoSubmitting.current =
        false;

      return;
    }

    sessionStorage.setItem(
      `test_result_${id}`,
      JSON.stringify(data)
    );

    localStorage.removeItem(
      answerKey
    );

    localStorage.removeItem(
      reviewKey
    );

    localStorage.removeItem(
      visitedKey
    );

    router.replace(
      `/result/${id}`
    );
  }

  /*
    =====================================================
    UI HELPERS
    =====================================================
  */

  function scrollQuestionToTop() {
    setTimeout(() => {
      questionScrollRef
        .current
        ?.scrollTo({
          top: 0,
          behavior: "smooth",
        });
    }, 0);
  }

  function formatTime(
    seconds
  ) {
    if (
      seconds === null ||
      seconds === undefined
    ) {
      return "--:--";
    }

    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) /
          60
      );

    const secs =
      seconds % 60;

    if (hours > 0) {
      return `${String(
        hours
      ).padStart(
        2,
        "0"
      )}:${String(
        minutes
      ).padStart(
        2,
        "0"
      )}:${String(
        secs
      ).padStart(
        2,
        "0"
      )}`;
    }

    return `${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      secs
    ).padStart(
      2,
      "0"
    )}`;
  }

  function paletteStyle(
    questionId
  ) {
    if (
      review[
        questionId
      ]
    ) {
      return {
        background:
          "#7c3aed",
        color:
          "#ffffff",
      };
    }

    if (
      answers[
        questionId
      ]
    ) {
      return {
        background:
          "#16a34a",
        color:
          "#ffffff",
      };
    }

    if (
      visited[
        questionId
      ]
    ) {
      return {
        background:
          "#dc2626",
        color:
          "#ffffff",
      };
    }

    return {
      background:
        "#ffffff",
      color:
        "#172033",
    };
  }

  /*
    =====================================================
    LOADING
    =====================================================
  */

  if (loading) {
    return (
      <div style={centerPage}>
        Loading test...
      </div>
    );
  }

  if (
    error &&
    !questions.length
  ) {
    return (
      <div style={centerPage}>
        <div>
          <b>Error:</b>{" "}
          {error}
        </div>
      </div>
    );
  }

  if (
    !questions.length ||
    !sections.length
  ) {
    return (
      <div style={centerPage}>
        Test configuration not available.
      </div>
    );
  }

  /*
    =====================================================
    CURRENT QUESTION / SECTION
    =====================================================
  */

  const item =
    questions[
      current
    ];

  const q =
    item?.questions;

  if (!q) {
    return (
      <div style={centerPage}>
        Question not available.
      </div>
    );
  }

  const timerType =
    getTimerType();

  const displaySection =
    getCurrentDisplaySection();

  const currentSectionIndex =
    timerType === "sectional"
      ? activeSection
      : getSectionIndexForQuestion(
          current
        );

  const currentLocalNumber =
    displaySection
      ? current -
          displaySection.startIndex +
          1
      : current + 1;

  const sectionQuestions =
    displaySection
      ? questions.slice(
          displaySection.startIndex,
          displaySection.endIndex + 1
        )
      : questions;

  const sectionAnswered =
    sectionQuestions.filter(
      (item) =>
        answers[
          item.questions.id
        ]
    ).length;

  const sectionMarked =
    sectionQuestions.filter(
      (item) =>
        review[
          item.questions.id
        ]
    ).length;

  /*
    Language fallback
  */

  const displayQuestion =
    language === "hindi"
      ? q.question_text_hi ||
        q.question_text
      : q.question_text;

  const options = [
    {
      key: "A",
      text:
        language === "hindi"
          ? q.option_a_hi ||
            q.option_a
          : q.option_a,
    },
    {
      key: "B",
      text:
        language === "hindi"
          ? q.option_b_hi ||
            q.option_b
          : q.option_b,
    },
    {
      key: "C",
      text:
        language === "hindi"
          ? q.option_c_hi ||
            q.option_c
          : q.option_c,
    },
    {
      key: "D",
      text:
        language === "hindi"
          ? q.option_d_hi ||
            q.option_d
          : q.option_d,
    },
  ];

  /*
    Palette section
  */

  const paletteSectionData =
    sections[
      paletteSection
    ] ||
    displaySection ||
    sections[0];

  const paletteQuestions =
    questions.slice(
      paletteSectionData.startIndex,
      paletteSectionData.endIndex + 1
    );

  const paletteAnswered =
    paletteQuestions.filter(
      (item) =>
        answers[
          item.questions.id
        ]
    ).length;

  const paletteMarked =
    paletteQuestions.filter(
      (item) =>
        review[
          item.questions.id
        ]
    ).length;

  const isLastSection =
    activeSection >=
    sections.length - 1;

  const canNext =
    timerType === "sectional"
      ? current <
        sections[
          activeSection
        ].endIndex
      : current <
        questions.length - 1;

  return (
    <div style={pageShell}>

      {/* =================================================
          HEADER
      ================================================= */}

      <header style={topBar}>

        <div style={timerBlock}>

          <div style={timerIcon}>
            ◷
          </div>

          <div>
            <div style={timerText}>
              {formatTime(
                timeLeft
              )}
            </div>

            <div style={timerLabel}>
              {timerType ===
              "sectional"
                ? "Section Time"
                : "Time Left"}
            </div>
          </div>

        </div>

        <div style={headerMiddle}>

          <div style={testTitle}>
            {test?.title}
          </div>

          <div style={examName}>
            {
              examConfig?.exam
                ?.exam_name
            }
          </div>

        </div>

        <div style={headerRight}>

          <select
            value={language}
            onChange={(e) =>
              changeLanguage(
                e.target.value
              )
            }
            style={headerLanguageSelect}
            aria-label="Change language"
          >
            <option value="english">
              English
            </option>

            <option value="hindi">
              हिन्दी
            </option>
          </select>

          <button
            type="button"
            onClick={() => {
              setPaletteSection(
                currentSectionIndex
              );

              setPaletteOpen(
                true
              );
            }}
            style={menuButton}
            aria-label="Open question palette"
          >
            ☰
          </button>

        </div>

      </header>

      {/* =================================================
          SECTION BAR
      ================================================= */}

      <div style={sectionStrip}>

        <div style={sectionScroller}>

          {sections.map(
            (
              section,
              index
            ) => {
              const active =
                index ===
                currentSectionIndex;

              const locked =
                timerType ===
                  "sectional" &&
                index <
                  activeSection;

              const futureLocked =
                timerType ===
                  "sectional" &&
                index >
                  activeSection;

              return (
                <button
                  key={
                    section.sectionCode
                  }
                  type="button"
                  disabled={
                    locked ||
                    futureLocked
                  }
                  onClick={() =>
                    goToSection(
                      index
                    )
                  }
                  style={{
                    ...sectionTab,

                    ...(active
                      ? activeSectionTab
                      : {}),

                    opacity:
                      locked ||
                      futureLocked
                        ? 0.45
                        : 1,
                  }}
                >
                  {language ===
                    "hindi"
                    ? section.sectionNameHi ||
                      section.sectionName
                    : section.sectionName}

                  {locked && (
                    <span style={lockText}>
                      🔒
                    </span>
                  )}
                </button>
              );
            }
          )}

        </div>

      </div>

      {/* =================================================
          STATUS
      ================================================= */}

      <div style={statusStrip}>

        <div style={questionCircle}>
          {currentLocalNumber}
        </div>

        <div style={statusTextBlock}>

          <div style={sectionName}>
            {language ===
            "hindi"
              ? displaySection
                  ?.sectionNameHi ||
                displaySection
                  ?.sectionName
              : displaySection
                  ?.sectionName}
          </div>

          <div style={statusMini}>
            Answered{" "}
            <b>
              {sectionAnswered}
            </b>

            {" · "}

            Review{" "}
            <b>
              {sectionMarked}
            </b>

            {saving && (
              <>
                {" · "}
                <span style={savingText}>
                  Saving...
                </span>
              </>
            )}
          </div>

        </div>

        <div style={overallCount}>
          {current + 1}/
          {questions.length}
        </div>

      </div>

      {/* =================================================
          QUESTION AREA
      ================================================= */}

      <main
        ref={questionScrollRef}
        style={questionScrollArea}
      >

        <div style={questionInner}>

          <div style={questionMeta}>
            {language ===
            "hindi"
              ? `प्रश्न ${currentLocalNumber}`
              : `Question ${currentLocalNumber}`}
          </div>

          <div style={questionText}>
            {displayQuestion}
          </div>

          <div style={optionsWrap}>

            {options.map(
              (option) => {
                const selected =
                  answers[
                    q.id
                  ] ===
                  option.key;

                return (
                  <button
                    type="button"
                    key={
                      option.key
                    }
                    onClick={() =>
                      selectAnswer(
                        q.id,
                        option.key
                      )
                    }
                    style={{
                      ...optionCard,

                      ...(selected
                        ? selectedOption
                        : {}),
                    }}
                  >

                    <span
                      style={{
                        ...optionLetter,

                        ...(selected
                          ? selectedOptionLetter
                          : {}),
                      }}
                    >
                      {option.key}
                    </span>

                    <span style={optionText}>
                      {option.text}
                    </span>

                    <span
                      style={{
                        ...radioMark,

                        ...(selected
                          ? selectedRadio
                          : {}),
                      }}
                    >
                      {selected
                        ? "✓"
                        : ""}
                    </span>

                  </button>
                );
              }
            )}

          </div>

          {error && (
            <div style={errorBox}>
              {error}
            </div>
          )}

        </div>

      </main>

      {/* =================================================
          BOTTOM ACTIONS
      ================================================= */}

      <div style={bottomBar}>

        <button
          type="button"
          onClick={
            markAndNext
          }
          style={markButton}
        >
          <span style={buttonMainText}>
            Mark & Next
          </span>

          <span style={buttonSubText}>
            Review
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            clearAnswer(
              q.id
            )
          }
          style={clearButton}
        >
          <span style={buttonMainText}>
            Clear
          </span>

          <span style={buttonSubText}>
            Response
          </span>
        </button>

        <button
          type="button"
          onClick={
            nextQuestion
          }
          disabled={
            !canNext
          }
          style={{
            ...saveNextButton,

            opacity:
              canNext
                ? 1
                : 0.45,
          }}
        >
          <span style={buttonMainText}>
            Save & Next
          </span>

          <span style={buttonSubText}>
            Next Question
          </span>
        </button>

      </div>

      {/* =================================================
          PALETTE
      ================================================= */}

      {paletteOpen && (
        <>

          <div
            style={overlay}
            onClick={() =>
              setPaletteOpen(
                false
              )
            }
          />

          <aside style={drawer}>

            <div style={drawerHeader}>

              <div>
                <div style={drawerTitle}>
                  Question Palette
                </div>

                <div style={drawerSubtitle}>
                  {
                    examConfig
                      ?.exam
                      ?.exam_name
                  }
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPaletteOpen(
                    false
                  )
                }
                style={closeButton}
              >
                ✕
              </button>

            </div>

            {/* PALETTE SECTION TABS */}

            <div style={paletteSectionTabs}>

              {sections.map(
                (
                  section,
                  index
                ) => {
                  const disabled =
                    timerType ===
                      "sectional" &&
                    index !==
                      activeSection;

                  return (
                    <button
                      type="button"
                      key={
                        section.sectionCode
                      }
                      disabled={
                        disabled
                      }
                      onClick={() =>
                        setPaletteSection(
                          index
                        )
                      }
                      style={{
                        ...paletteSectionButton,

                        ...(paletteSection ===
                        index
                          ? paletteSectionActive
                          : {}),

                        opacity:
                          disabled
                            ? 0.4
                            : 1,
                      }}
                    >
                      {section.shortName}
                    </button>
                  );
                }
              )}

            </div>

            <div style={drawerStats}>

              <span>
                Answered{" "}
                <b>
                  {paletteAnswered}
                </b>
              </span>

              <span>
                Review{" "}
                <b>
                  {paletteMarked}
                </b>
              </span>

              <span>
                Total{" "}
                <b>
                  {
                    paletteQuestions.length
                  }
                </b>
              </span>

            </div>

            <div style={paletteGrid}>

              {paletteQuestions.map(
                (
                  item,
                  localIndex
                ) => {
                  const absoluteIndex =
                    paletteSectionData
                      .startIndex +
                    localIndex;

                  const questionId =
                    item.questions.id;

                  const status =
                    paletteStyle(
                      questionId
                    );

                  return (
                    <button
                      type="button"
                      key={
                        questionId
                      }
                      onClick={() =>
                        goQuestion(
                          absoluteIndex
                        )
                      }
                      style={{
                        ...paletteNumber,

                        background:
                          status.background,

                        color:
                          status.color,

                        border:
                          current ===
                          absoluteIndex
                            ? "2px solid #111827"
                            : "1px solid #cbd5e1",
                      }}
                    >
                      {localIndex +
                        1}
                    </button>
                  );
                }
              )}

            </div>

            <div style={legendBox}>

              <div>
                🟢 Answered
              </div>

              <div>
                🔴 Not Answered
              </div>

              <div>
                🟣 Review
              </div>

              <div>
                ⚪ Not Visited
              </div>

            </div>

            {/* ============================================
                SUBMIT AREA
            ============================================ */}

            <div style={submitArea}>

              {timerType ===
              "sectional" ? (
                <>
                  <div style={submitTitle}>
                    {isLastSection
                      ? "Final Test Submission"
                      : "Submit Current Section"}
                  </div>

                  <div style={submitInfo}>

                    <span>
                      Attempted{" "}
                      <b>
                        {sectionAnswered}
                      </b>
                    </span>

                    <span>
                      Unattempted{" "}
                      <b>
                        {sectionQuestions.length -
                          sectionAnswered}
                      </b>
                    </span>

                    <span>
                      Review{" "}
                      <b>
                        {sectionMarked}
                      </b>
                    </span>

                  </div>

                  {isLastSection ? (
                    <button
                      type="button"
                      onClick={() =>
                        submitTest(
                          false
                        )
                      }
                      disabled={
                        submitting ||
                        saving
                      }
                      style={{
                        ...submitButton,

                        opacity:
                          submitting ||
                          saving
                            ? 0.6
                            : 1,
                      }}
                    >
                      {submitting
                        ? "Submitting..."
                        : saving
                        ? "Saving Responses..."
                        : "Submit Final Test"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={
                        manualSubmitSection
                      }
                      disabled={
                        changingSection ||
                        saving
                      }
                      style={{
                        ...submitButton,

                        opacity:
                          changingSection ||
                          saving
                            ? 0.6
                            : 1,
                      }}
                    >
                      {changingSection
                        ? "Opening Next Section..."
                        : saving
                        ? "Saving Responses..."
                        : `Submit ${displaySection?.shortName} Section`}
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div style={submitTitle}>
                    Final Test Submission
                  </div>

                  <div style={submitInfo}>

                    <span>
                      Attempted{" "}
                      <b>
                        {
                          Object.keys(
                            answers
                          ).length
                        }
                      </b>
                    </span>

                    <span>
                      Unattempted{" "}
                      <b>
                        {
                          questions.length -
                          Object.keys(
                            answers
                          ).length
                        }
                      </b>
                    </span>

                    <span>
                      Review{" "}
                      <b>
                        {
                          Object.values(
                            review
                          ).filter(
                            Boolean
                          ).length
                        }
                      </b>
                    </span>

                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      submitTest(
                        false
                      )
                    }
                    disabled={
                      submitting ||
                      saving
                    }
                    style={{
                      ...submitButton,

                      opacity:
                        submitting ||
                        saving
                          ? 0.6
                          : 1,
                    }}
                  >
                    {submitting
                      ? "Submitting..."
                      : saving
                      ? "Saving Responses..."
                      : "Submit Final Test"}
                  </button>
                </>
              )}

            </div>

          </aside>

        </>
      )}

    </div>
  );
}

/*
  =========================================================
  SECTION NORMALIZER
  =========================================================
*/

function normalizeSections(
  dbSections,
  actualQuestionCount,
  config
) {
  const sorted =
    [...dbSections].sort(
      (a, b) =>
        Number(
          a.display_order
        ) -
        Number(
          b.display_order
        )
    );

  const declaredTotal =
    sorted.reduce(
      (sum, section) =>
        sum +
        Number(
          section.question_count ||
            0
        ),
      0
    );

  /*
    If official subject-wise fixed
    question distribution is unavailable,
    use one Full Paper navigation group.

    Example:
    UP Police Constable configuration
    currently has no artificial 37/38 split.
  */

  if (
    !sorted.length ||
    declaredTotal <= 0 ||
    declaredTotal !==
      actualQuestionCount
  ) {
    return [
      {
        sectionId: null,

        sectionCode:
          "FULL_PAPER",

        sectionName:
          "Full Paper",

        sectionNameHi:
          "सम्पूर्ण प्रश्नपत्र",

        shortName:
          "Full Paper",

        questionCount:
          actualQuestionCount,

        totalMarks:
          config?.stage
            ?.total_marks,

        marksPerQuestion:
          config?.stage
            ?.marks_per_question,

        negativeMark:
          config?.stage
            ?.negative_mark,

        durationMinutes:
          config?.stage
            ?.duration_minutes,

        hasSectionalTimer:
          false,

        autoLockOnTimeout:
          false,

        allowPreviousSection:
          true,

        displayOrder: 1,

        startIndex: 0,

        endIndex:
          Math.max(
            actualQuestionCount -
              1,
            0
          ),
      },
    ];
  }

  let runningIndex = 0;

  return sorted.map(
    (section) => {
      const count =
        Number(
          section.question_count
        );

      const startIndex =
        runningIndex;

      const endIndex =
        startIndex +
        count -
        1;

      runningIndex =
        endIndex + 1;

      return {
        sectionId:
          section.section_id,

        sectionCode:
          section.section_code,

        sectionName:
          section.section_name,

        sectionNameHi:
          section.section_name_hi,

        shortName:
          makeShortName(
            section.section_name,
            section.section_code
          ),

        questionCount:
          count,

        totalMarks:
          Number(
            section.total_marks ||
              0
          ),

        marksPerQuestion:
          Number(
            section.marks_per_question ||
              0
          ),

        negativeMark:
          Number(
            section.negative_mark ||
              0
          ),

        durationMinutes:
          section.duration_minutes ===
          null
            ? null
            : Number(
                section.duration_minutes
              ),

        hasSectionalTimer:
          Boolean(
            section.has_sectional_timer
          ),

        autoLockOnTimeout:
          Boolean(
            section.auto_lock_on_timeout
          ),

        allowPreviousSection:
          Boolean(
            section.allow_previous_section
          ),

        displayOrder:
          Number(
            section.display_order
          ),

        startIndex,

        endIndex,
      };
    }
  );
}

function makeShortName(
  name,
  code
) {
  const map = {
    REASONING:
      "Reasoning",

    GENERAL_AWARENESS:
      "GA",

    GENERAL_KNOWLEDGE:
      "GK",

    QUANT:
      "Quant",

    MATHS:
      "Maths",

    ENGLISH:
      "English",

    LANGUAGE:
      "Language",

    GENERAL_HINDI:
      "Hindi",

    HINDI_COMPUTER:
      "Hindi/Computer",

    LAW_GK:
      "Law/GK",

    NUMERICAL_MENTAL:
      "Numerical",

    MENTAL_APTITUDE_REASONING:
      "Reasoning",
  };

  return (
    map[code] ||
    name
      ?.split(" ")
      .slice(0, 2)
      .join(" ") ||
    "Section"
  );
}

/*
  =========================================================
  STYLES
  =========================================================
*/

const pageShell = {
  height: "100dvh",
  minHeight: "100vh",

  display: "flex",
  flexDirection: "column",

  overflow: "hidden",

  background:
    "#f8fafc",

  color:
    "#111827",
};

const topBar = {
  flexShrink: 0,

  minHeight: "66px",

  background:
    "#17191d",

  color:
    "#ffffff",

  display: "flex",

  alignItems:
    "center",

  gap: "8px",

  padding:
    "7px 9px",

  zIndex: 50,
};

const timerBlock = {
  display: "flex",

  alignItems:
    "center",

  gap: "5px",

  flexShrink: 0,
};

const timerIcon = {
  width: "27px",

  height: "27px",

  border:
    "2px solid #ffffff",

  borderRadius:
    "50%",

  display: "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize: "12px",
};

const timerText = {
  fontSize: "15px",

  fontWeight:
    "800",

  lineHeight: 1.1,

  whiteSpace:
    "nowrap",
};

const timerLabel = {
  fontSize: "8px",

  opacity: 0.7,

  marginTop: "2px",
};

const headerMiddle = {
  flex: 1,

  minWidth: 0,

  textAlign:
    "center",
};

const testTitle = {
  fontSize: "12px",

  fontWeight:
    "800",

  overflow:
    "hidden",

  textOverflow:
    "ellipsis",

  whiteSpace:
    "nowrap",
};

const examName = {
  fontSize: "9px",

  opacity: 0.68,

  marginTop: "2px",

  overflow:
    "hidden",

  textOverflow:
    "ellipsis",

  whiteSpace:
    "nowrap",
};

const headerRight = {
  display: "flex",

  alignItems:
    "center",

  gap: "4px",

  flexShrink: 0,
};

const headerLanguageSelect = {
  width: "85px",

  height: "28px",

  border:
    "1px solid #666",

  borderRadius:
    "5px",

  background:
    "#27272a",

  color:
    "#ffffff",

  padding:
    "0 4px",

  fontSize: "10px",

  fontWeight:
    "700",

  outline: "none",
};

const menuButton = {
  width: "34px",

  height: "36px",

  border: 0,

  borderRadius:
    "6px",

  background:
    "transparent",

  color:
    "#ffffff",

  fontSize: "24px",

  cursor:
    "pointer",
};

/*
  SECTION STRIP
*/

const sectionStrip = {
  flexShrink: 0,

  background:
    "#ffffff",

  borderBottom:
    "1px solid #e5e7eb",
};

const sectionScroller = {
  display: "flex",

  gap: "5px",

  overflowX:
    "auto",

  padding:
    "6px 8px",

  scrollbarWidth:
    "none",
};

const sectionTab = {
  flexShrink: 0,

  minHeight:
    "30px",

  maxWidth:
    "170px",

  padding:
    "5px 9px",

  border:
    "1px solid #d8dee7",

  borderRadius:
    "7px",

  background:
    "#ffffff",

  color:
    "#475569",

  fontSize:
    "10px",

  fontWeight:
    "700",

  overflow:
    "hidden",

  textOverflow:
    "ellipsis",

  whiteSpace:
    "nowrap",

  cursor:
    "pointer",
};

const activeSectionTab = {
  background:
    "#2563eb",

  color:
    "#ffffff",

  border:
    "1px solid #2563eb",
};

const lockText = {
  marginLeft:
    "4px",

  fontSize:
    "9px",
};

/*
  STATUS
*/

const statusStrip = {
  flexShrink: 0,

  minHeight:
    "48px",

  background:
    "#ffffff",

  borderBottom:
    "1px solid #e5e7eb",

  display: "flex",

  alignItems:
    "center",

  gap: "9px",

  padding:
    "5px 10px",
};

const questionCircle = {
  width: "36px",

  height: "36px",

  minWidth:
    "36px",

  borderRadius:
    "50%",

  background:
    "#64748b",

  color:
    "#ffffff",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontWeight:
    "800",

  fontSize:
    "14px",
};

const statusTextBlock = {
  minWidth: 0,

  flex: 1,
};

const sectionName = {
  fontSize:
    "11px",

  fontWeight:
    "800",

  overflow:
    "hidden",

  whiteSpace:
    "nowrap",

  textOverflow:
    "ellipsis",
};

const statusMini = {
  fontSize:
    "9px",

  marginTop:
    "2px",

  color:
    "#64748b",
};

const savingText = {
  color:
    "#2563eb",

  fontWeight:
    "700",
};

const overallCount = {
  flexShrink: 0,

  fontSize:
    "10px",

  fontWeight:
    "700",

  color:
    "#64748b",
};

/*
  QUESTION
*/

const questionScrollArea = {
  flex: 1,

  minHeight: 0,

  overflowY:
    "auto",

  WebkitOverflowScrolling:
    "touch",

  overscrollBehavior:
    "contain",
};

const questionInner = {
  width: "100%",

  maxWidth:
    "820px",

  margin:
    "0 auto",

  padding:
    "11px 11px 16px",
};

const questionMeta = {
  fontSize:
    "10px",

  fontWeight:
    "800",

  color:
    "#64748b",

  marginBottom:
    "6px",
};

const questionText = {
  fontSize:
    "clamp(15px, 4.2vw, 20px)",

  lineHeight:
    "1.4",

  fontWeight:
    "700",

  color:
    "#111827",

  marginBottom:
    "12px",
};

const optionsWrap = {
  display:
    "grid",

  gap:
    "7px",
};

const optionCard = {
  width:
    "100%",

  minHeight:
    "49px",

  border:
    "1px solid #d7dce3",

  borderRadius:
    "8px",

  background:
    "#ffffff",

  padding:
    "8px 9px",

  display:
    "flex",

  alignItems:
    "center",

  gap:
    "9px",

  textAlign:
    "left",

  cursor:
    "pointer",

  fontFamily:
    "inherit",
};

const selectedOption = {
  border:
    "2px solid #2563eb",

  background:
    "#eff6ff",
};

const optionLetter = {
  width: "29px",

  height: "29px",

  minWidth:
    "29px",

  borderRadius:
    "50%",

  border:
    "1px solid #cbd5e1",

  background:
    "#f8fafc",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontWeight:
    "800",

  fontSize:
    "12px",

  color:
    "#475569",
};

const selectedOptionLetter = {
  background:
    "#2563eb",

  color:
    "#ffffff",

  border:
    "1px solid #2563eb",
};

const optionText = {
  flex: 1,

  fontSize:
    "clamp(13px, 3.7vw, 16px)",

  lineHeight:
    "1.35",

  color:
    "#1f2937",
};

const radioMark = {
  width: "21px",

  height: "21px",

  minWidth:
    "21px",

  borderRadius:
    "50%",

  border:
    "2px solid #cbd5e1",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  fontSize:
    "10px",

  color:
    "#ffffff",
};

const selectedRadio = {
  background:
    "#2563eb",

  border:
    "2px solid #2563eb",
};

const errorBox = {
  marginTop:
    "9px",

  padding:
    "8px",

  background:
    "#fef2f2",

  borderRadius:
    "7px",

  color:
    "#b91c1c",

  fontSize:
    "11px",
};

/*
  BOTTOM ACTION BAR
*/

const bottomBar = {
  flexShrink: 0,

  minHeight:
    "65px",

  background:
    "#ffffff",

  borderTop:
    "1px solid #dfe3e8",

  display:
    "grid",

  gridTemplateColumns:
    "1fr 0.7fr 1fr",

  gap:
    "6px",

  padding:
    "6px 8px max(6px, env(safe-area-inset-bottom))",

  zIndex: 60,
};

const actionBase = {
  minHeight:
    "48px",

  borderRadius:
    "8px",

  fontFamily:
    "inherit",

  cursor:
    "pointer",

  display:
    "flex",

  flexDirection:
    "column",

  justifyContent:
    "center",

  alignItems:
    "center",

  lineHeight: 1.1,
};

const markButton = {
  ...actionBase,

  border:
    "1px solid #7c3aed",

  background:
    "#ffffff",

  color:
    "#6d28d9",
};

const clearButton = {
  ...actionBase,

  border:
    "1px solid #475569",

  background:
    "#ffffff",

  color:
    "#334155",
};

const saveNextButton = {
  ...actionBase,

  border: 0,

  background:
    "#2563eb",

  color:
    "#ffffff",
};

const buttonMainText = {
  fontSize:
    "11px",

  fontWeight:
    "800",
};

const buttonSubText = {
  fontSize:
    "8px",

  marginTop:
    "3px",

  opacity:
    0.75,
};

/*
  DRAWER
*/

const overlay = {
  position:
    "fixed",

  inset: 0,

  background:
    "rgba(0,0,0,0.42)",

  zIndex: 998,
};

const drawer = {
  position:
    "fixed",

  top: 0,

  right: 0,

  width:
    "min(360px, 94vw)",

  height:
    "100dvh",

  background:
    "#ffffff",

  zIndex: 999,

  padding:
    "11px",

  overflowY:
    "auto",

  boxShadow:
    "-8px 0 25px rgba(0,0,0,0.18)",
};

const drawerHeader = {
  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "space-between",

  gap:
    "8px",
};

const drawerTitle = {
  fontSize:
    "17px",

  fontWeight:
    "800",
};

const drawerSubtitle = {
  maxWidth:
    "250px",

  marginTop:
    "2px",

  fontSize:
    "9px",

  color:
    "#64748b",

  overflow:
    "hidden",

  textOverflow:
    "ellipsis",

  whiteSpace:
    "nowrap",
};

const closeButton = {
  width: "32px",

  height: "32px",

  minWidth:
    "32px",

  borderRadius:
    "7px",

  border:
    "1px solid #d7deea",

  background:
    "#ffffff",

  fontSize:
    "15px",

  cursor:
    "pointer",
};

const paletteSectionTabs = {
  display:
    "flex",

  gap:
    "5px",

  overflowX:
    "auto",

  marginTop:
    "9px",

  paddingBottom:
    "2px",
};

const paletteSectionButton = {
  flexShrink: 0,

  border:
    "1px solid #d7deea",

  borderRadius:
    "6px",

  background:
    "#ffffff",

  padding:
    "5px 7px",

  fontSize:
    "9px",

  fontWeight:
    "700",

  cursor:
    "pointer",
};

const paletteSectionActive = {
  background:
    "#2563eb",

  color:
    "#ffffff",

  border:
    "1px solid #2563eb",
};

const drawerStats = {
  display:
    "flex",

  justifyContent:
    "space-between",

  gap:
    "6px",

  marginTop:
    "8px",

  padding:
    "6px 7px",

  borderRadius:
    "7px",

  background:
    "#f8fafc",

  fontSize:
    "10px",
};

const paletteGrid = {
  display:
    "grid",

  gridTemplateColumns:
    "repeat(7, 1fr)",

  gap:
    "5px",

  marginTop:
    "9px",
};

const paletteNumber = {
  minHeight:
    "30px",

  padding:
    "2px",

  borderRadius:
    "5px",

  fontSize:
    "10px",

  fontWeight:
    "800",

  cursor:
    "pointer",
};

const legendBox = {
  display:
    "grid",

  gridTemplateColumns:
    "1fr 1fr",

  gap:
    "3px 6px",

  marginTop:
    "9px",

  fontSize:
    "9px",

  lineHeight:
    "1.4",
};

const submitArea = {
  marginTop:
    "9px",

  paddingTop:
    "9px",

  borderTop:
    "1px solid #e2e8f0",
};

const submitTitle = {
  fontSize:
    "13px",

  fontWeight:
    "800",

  marginBottom:
    "6px",
};

const submitInfo = {
  display:
    "flex",

  flexWrap:
    "wrap",

  gap:
    "4px 10px",

  padding:
    "6px 7px",

  marginBottom:
    "7px",

  background:
    "#f8fafc",

  borderRadius:
    "7px",

  fontSize:
    "9px",
};

const submitButton = {
  width:
    "100%",

  minHeight:
    "41px",

  border: 0,

  borderRadius:
    "8px",

  background:
    "#1769e0",

  color:
    "#ffffff",

  fontWeight:
    "800",

  fontSize:
    "12px",

  cursor:
    "pointer",
};

const centerPage = {
  minHeight:
    "100vh",

  display:
    "flex",

  alignItems:
    "center",

  justifyContent:
    "center",

  padding:
    "20px",

  textAlign:
    "center",
};
