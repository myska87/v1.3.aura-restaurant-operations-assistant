
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GraduationCap, Play, CheckCircle, Lock, Clock, Award, Upload, FileText, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function OnboardingTraining() {
  const queryClient = useQueryClient();
  const [selectedStep, setSelectedStep] = useState(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: onboardingSteps = [] } = useQuery({
    queryKey: ['onboardingSteps'],
    queryFn: () => base44.entities.OnboardingStep.list('step_number'),
  });

  const { data: myProgress = [] } = useQuery({
    queryKey: ['onboardingProgress', user?.email],
    queryFn: () => base44.entities.OnboardingProgress.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const { data: myDocuments = [] } = useQuery({
    queryKey: ['staffDocuments', user?.email],
    queryFn: () => base44.entities.StaffDocument.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const createProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.OnboardingProgress.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingProgress'] });
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.OnboardingProgress.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboardingProgress'] });
    },
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: (data) => base44.entities.StaffDocument.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staffDocuments'] });
    },
  });

  // Initialize progress for all steps on first load
  useEffect(() => {
    if (onboardingSteps.length > 0 && myProgress.length === 0 && user?.email) {
      onboardingSteps.forEach((step, index) => {
        createProgressMutation.mutate({
          staff_email: user.email,
          staff_name: user.full_name,
          step_id: step.id,
          step_title: step.title,
          step_number: step.step_number,
          status: index === 0 ? 'in_progress' : 'locked',
        });
      });
    }
  }, [onboardingSteps, myProgress, user]);

  const getStepProgress = (stepId) => {
    return myProgress.find(p => p.step_id === stepId);
  };

  const getOverallProgress = () => {
    if (myProgress.length === 0) return 0;
    const completed = myProgress.filter(p => p.status === 'completed').length;
    return Math.round((completed / onboardingSteps.length) * 100);
  };

  const isStepUnlocked = (step) => {
    if (step.step_number === 1) return true;
    
    const previousStep = onboardingSteps.find(s => s.step_number === step.step_number - 1);
    if (!previousStep) return true;
    
    const previousProgress = getStepProgress(previousStep.id);
    return previousProgress?.status === 'completed';
  };

  const handleStartStep = async (step) => {
    const progress = getStepProgress(step.id);
    
    if (progress && progress.status === 'locked') {
      await updateProgressMutation.mutateAsync({
        id: progress.id,
        data: {
          status: 'in_progress',
          started_at: new Date().toISOString(),
        }
      });
    }
    
    setSelectedStep(step);
  };

  const handleCompleteStep = async (step) => {
    const progress = getStepProgress(step.id);
    
    if (!progress) return;

    await updateProgressMutation.mutateAsync({
      id: progress.id,
      data: {
        status: 'completed',
        completed_at: new Date().toISOString(),
      }
    });

    // Unlock next step
    const nextStep = onboardingSteps.find(s => s.step_number === step.step_number + 1);
    if (nextStep) {
      const nextProgress = getStepProgress(nextStep.id);
      if (nextProgress && nextProgress.status === 'locked') {
        await updateProgressMutation.mutateAsync({
          id: nextProgress.id,
          data: { status: 'in_progress' }
        });
      }
    }

    setSelectedStep(null);

    // Check if all steps completed
    const allCompleted = myProgress.filter(p => p.status === 'completed').length + 1 === onboardingSteps.length;
    if (allCompleted) {
      setShowCelebration(true);
      // Update user profile
      await base44.auth.updateMe({
        onboarding_completed: true,
        onboarding_completed_date: new Date().toISOString(),
      });
    }
  };

  const handleQuizSubmit = async (step) => {
    const questions = step.quiz_questions || [];
    let correctCount = 0;
    const results = [];

    questions.forEach((q, index) => {
      const userAnswer = quizAnswers[index];
      const isCorrect = userAnswer === q.correct_answer;
      if (isCorrect) correctCount++;

      results.push({
        question: q.question,
        options: q.options,
        userAnswer: userAnswer,
        correctAnswer: q.correct_answer,
        isCorrect: isCorrect,
      });
    });

    const score = Math.round((correctCount / questions.length) * 100);
    const passed = score >= (step.passing_score || 80);

    setQuizResults({
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      results: results,
      stepTitle: step.title,
    });

    // Save quiz result
    const progress = getStepProgress(step.id);
    if (progress) {
      await updateProgressMutation.mutateAsync({
        id: progress.id,
        data: {
          quiz_score: score,
          quiz_passed: passed,
          quiz_attempts: (progress.quiz_attempts || 0) + 1,
        }
      });
    }

    setShowQuiz(false);
    setShowResults(true);
    setQuizAnswers({});

    if (passed) {
      setTimeout(() => {
        handleCompleteStep(step);
      }, 2000);
    }
  };

  const handleDocumentUpload = async (e, step, docType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      await uploadDocumentMutation.mutateAsync({
        staff_email: user?.email,
        staff_name: user?.full_name,
        document_type: docType,
        document_name: file.name,
        file_url: file_url,
        uploaded_at: new Date().toISOString(),
        status: 'pending',
      });

      alert(`✅ ${file.name} uploaded successfully!`);

      // Update progress
      const progress = getStepProgress(step.id);
      if (progress) {
        const updatedDocs = [...(progress.documents_uploaded || []), file_url];
        await updateProgressMutation.mutateAsync({
          id: progress.id,
          data: {
            documents_uploaded: updatedDocs,
          }
        });
      }
    } catch (error) {
      console.error("Error uploading document:", error);
      alert("Failed to upload document. Please try again.");
    }
    setUploadingDoc(false);
  };

  const handleAcknowledge = async (step) => {
    const progress = getStepProgress(step.id);
    if (!progress) return;

    // If already acknowledged, just complete the step
    if (progress.acknowledged) {
      handleCompleteStep(step);
    }
  };

  const handleAcknowledgementChange = async (step, isChecked) => {
    const progress = getStepProgress(step.id);
    if (!progress) return;

    try {
      await updateProgressMutation.mutateAsync({
        id: progress.id,
        data: { 
          acknowledged: isChecked,
          acknowledged_at: isChecked ? new Date().toISOString() : null
        }
      });
    } catch (error) {
      console.error("Error updating acknowledgement:", error);
    }
  };

  const overallProgress = getOverallProgress();
  const completedSteps = myProgress.filter(p => p.status === 'completed').length;

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex gap-3 mb-6">
          <Link to={createPageUrl("StaffModel")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Staff Model
            </Button>
          </Link>
          <Link to={createPageUrl("Dashboard")}>
            <Button variant="outline" size="sm">
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-none shadow-lg mb-8">
            <CardContent className="p-8">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">
                    🎉 Welcome to Chai Patta, {user?.full_name?.split(' ')[0]}!
                  </h1>
                  <p className="text-xl text-blue-100 mb-4">
                    Your journey to becoming part of our amazing team starts here.
                  </p>
                  <p className="text-blue-50">
                    Complete all onboarding steps to unlock your full access and start making a difference.
                  </p>
                </div>
                <GraduationCap className="w-24 h-24 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Progress Overview */}
        <Card className="bg-white border-none shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">Your Progress</h3>
                <p className="text-gray-600">{completedSteps} of {onboardingSteps.length} steps completed</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600">{overallProgress}%</div>
                <p className="text-sm text-gray-500 mt-1">Complete</p>
              </div>
            </div>
            <Progress value={overallProgress} className="h-3" />
          </CardContent>
        </Card>

        {/* Onboarding Steps */}
        <div className="space-y-4">
          {onboardingSteps.map((step, index) => {
            const progress = getStepProgress(step.id);
            const isUnlocked = isStepUnlocked(step);
            const isCompleted = progress?.status === 'completed';
            const isInProgress = progress?.status === 'in_progress';

            return (
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className={`border-none shadow-sm ${
                  isCompleted ? 'bg-green-50' : 
                  isInProgress ? 'bg-blue-50' : 
                  isUnlocked ? 'bg-white' : 'bg-gray-50'
                }`}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {/* Step Number Icon */}
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isCompleted ? 'bg-green-500' :
                        isInProgress ? 'bg-blue-500' :
                        isUnlocked ? 'bg-gray-300' : 'bg-gray-200'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6 text-white" />
                        ) : !isUnlocked ? (
                          <Lock className="w-6 h-6 text-gray-500" />
                        ) : (
                          <span className="text-white font-bold">{step.step_number}</span>
                        )}
                      </div>

                      {/* Step Content */}
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                            <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {isCompleted && (
                              <Badge className="bg-green-100 text-green-800">Completed</Badge>
                            )}
                            {isInProgress && (
                              <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                            )}
                            {!isUnlocked && (
                              <Badge className="bg-gray-100 text-gray-800">Locked</Badge>
                            )}
                          </div>
                        </div>

                        {/* Step Details */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          {step.estimated_duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{step.estimated_duration_minutes} min</span>
                            </div>
                          )}
                          {step.content_type && (
                            <Badge variant="outline">{step.content_type}</Badge>
                          )}
                        </div>

                        {/* Progress Details */}
                        {progress && isInProgress && (
                          <div className="mb-4 p-3 bg-white rounded-lg border border-blue-200">
                            <div className="text-sm space-y-1">
                              {progress.started_at && (
                                <p className="text-gray-600">
                                  Started: {format(new Date(progress.started_at), 'PPp')}
                                </p>
                              )}
                              {progress.video_watched && (
                                <p className="text-green-600">✓ Video watched</p>
                              )}
                              {progress.quiz_score !== undefined && (
                                <p className={progress.quiz_passed ? 'text-green-600' : 'text-red-600'}>
                                  Quiz Score: {progress.quiz_score}% {progress.quiz_passed ? '✓' : '✗'}
                                </p>
                              )}
                              {progress.acknowledged && (
                                <p className="text-green-600">✓ Acknowledged</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        {isUnlocked && !isCompleted && (
                          <Button
                            onClick={() => handleStartStep(step)}
                            className={isInProgress ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700'}
                          >
                            {isInProgress ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Continue
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Start Step
                              </>
                            )}
                          </Button>
                        )}

                        {isCompleted && progress?.completed_at && (
                          <div className="text-sm text-green-600">
                            ✓ Completed on {format(new Date(progress.completed_at), 'PPP')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Step Detail Dialog */}
        {selectedStep && (
          <Dialog open={!!selectedStep} onOpenChange={() => setSelectedStep(null)}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">{selectedStep.title}</DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Video Content */}
                {selectedStep.content_type === 'video' && selectedStep.video_url && (
                  <div>
                    <h3 className="font-semibold mb-3">Training Video</h3>
                    <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      <video
                        src={selectedStep.video_url}
                        controls
                        className="w-full h-full"
                        onTimeUpdate={(e) => {
                          const progress = (e.target.currentTime / e.target.duration) * 100;
                          if (progress >= 90) {
                            const stepProgress = getStepProgress(selectedStep.id);
                            if (stepProgress && !stepProgress.video_watched) {
                              updateProgressMutation.mutate({
                                id: stepProgress.id,
                                data: {
                                  video_watched: true,
                                  video_watch_percentage: 100,
                                }
                              });
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Text Content */}
                {selectedStep.content_text && (
                  <div>
                    <h3 className="font-semibold mb-3">Instructions</h3>
                    <div className="prose max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap">{selectedStep.content_text}</p>
                    </div>
                  </div>
                )}

                {/* Document Upload */}
                {selectedStep.content_type === 'document_upload' && selectedStep.required_documents && (
                  <div>
                    <h3 className="font-semibold mb-3">Required Documents</h3>
                    <div className="space-y-3">
                      {selectedStep.required_documents.map((docType, index) => {
                        const uploaded = myDocuments.find(d => d.document_type === docType);
                        return (
                          <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <FileText className="w-5 h-5 text-gray-600" />
                              <span className="font-medium capitalize">{docType.replace(/_/g, ' ')}</span>
                            </div>
                            {uploaded ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Uploaded
                              </Badge>
                            ) : (
                              <div>
                                <input
                                  type="file"
                                  id={`doc-${docType}`}
                                  className="hidden"
                                  onChange={(e) => handleDocumentUpload(e, selectedStep, docType)}
                                  accept=".pdf,.jpg,.jpeg,.png"
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById(`doc-${docType}`).click()}
                                  disabled={uploadingDoc}
                                >
                                  <Upload className="w-4 h-4 mr-2" />
                                  {uploadingDoc ? 'Uploading...' : 'Upload'}
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Acknowledgement */}
                {selectedStep.content_type === 'acknowledgement' && selectedStep.acknowledgement_text && (
                  <div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                      <p className="text-gray-800">{selectedStep.acknowledgement_text}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const currentProgress = getStepProgress(selectedStep.id);
                        const isCurrentlyChecked = currentProgress?.acknowledged || false;
                        handleAcknowledgementChange(selectedStep, !isCurrentlyChecked);
                      }}
                      disabled={getStepProgress(selectedStep.id)?.acknowledged}
                      className="w-full p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-6 h-6 flex-shrink-0 mt-0.5 rounded border-2 flex items-center justify-center ${
                          getStepProgress(selectedStep.id)?.acknowledged 
                            ? 'bg-blue-600 border-blue-600' 
                            : 'border-gray-300 bg-white'
                        }`}>
                          {getStepProgress(selectedStep.id)?.acknowledged && (
                            <CheckCircle className="w-4 h-4 text-white" />
                          )}
                        </div>
                        <span className="flex-1 text-gray-800 leading-relaxed">
                          I have read and understood the above information and agree to comply with these requirements.
                        </span>
                      </div>
                    </button>
                  </div>
                )}

                {/* Quiz Button */}
                {selectedStep.quiz_questions && selectedStep.quiz_questions.length > 0 && (
                  <div>
                    <Button
                      onClick={() => setShowQuiz(true)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      Take Knowledge Check ({selectedStep.quiz_questions.length} questions)
                    </Button>
                  </div>
                )}

                {/* Complete Button */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedStep(null)}
                  >
                    Close
                  </Button>
                  {selectedStep.content_type === 'acknowledgement' && (
                    <Button
                      onClick={() => handleAcknowledge(selectedStep)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={!getStepProgress(selectedStep.id)?.acknowledged}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Complete Step
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Quiz Dialog */}
        {showQuiz && selectedStep && (
          <Dialog open={showQuiz} onOpenChange={setShowQuiz}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Knowledge Check: {selectedStep.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    📝 Answer all questions. You need {selectedStep.passing_score || 80}% or higher to pass.
                  </p>
                </div>

                {selectedStep.quiz_questions?.map((q, index) => (
                  <div key={index} className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <Label className="text-base font-semibold text-gray-900 block mb-3">
                      {index + 1}. {q.question}
                    </Label>
                    <div className="space-y-2">
                      {q.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          htmlFor={`q${index}-opt${optIndex}`}
                          className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                            quizAnswers[index] === optIndex
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="radio"
                            id={`q${index}-opt${optIndex}`}
                            name={`question-${index}`}
                            value={optIndex}
                            checked={quizAnswers[index] === optIndex}
                            onChange={(e) => setQuizAnswers({ ...quizAnswers, [index]: parseInt(e.target.value) })}
                            className="w-5 h-5 cursor-pointer"
                          />
                          <span className="flex-1 text-gray-900 cursor-pointer">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => {
                    setShowQuiz(false);
                    setQuizAnswers({});
                  }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleQuizSubmit(selectedStep)}
                    className="bg-green-600 hover:bg-green-700"
                    disabled={Object.keys(quizAnswers).length !== selectedStep.quiz_questions?.length}
                  >
                    Submit Quiz
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Quiz Results Dialog */}
        {showResults && quizResults && (
          <Dialog open={showResults} onOpenChange={setShowResults}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl">
                  {quizResults.passed ? '🎉 Congratulations!' : '📚 Keep Learning!'}
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                <Card className={`border-none shadow-lg ${
                  quizResults.passed
                    ? 'bg-gradient-to-r from-green-500 to-green-600'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600'
                } text-white`}>
                  <CardContent className="p-6 text-center">
                    <div className="text-6xl font-bold mb-3">
                      {quizResults.score}%
                    </div>
                    <p className="text-xl mb-2">
                      {quizResults.correctCount} out of {quizResults.totalQuestions} correct
                    </p>
                    <p className="text-lg opacity-90">
                      {quizResults.passed
                        ? '✅ You passed! Moving to next step...'
                        : '⚠️ You need 80% to pass. Review the content and try again.'}
                    </p>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900">Detailed Results:</h3>
                  {quizResults.results.map((result, index) => (
                    <Card key={index} className={`border-2 ${
                      result.isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            result.isCorrect ? 'bg-green-500' : 'bg-red-500'
                          } text-white font-bold`}>
                            {result.isCorrect ? '✓' : '✗'}
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-3">
                              {index + 1}. {result.question}
                            </p>
                            <div className="space-y-2">
                              {result.options.map((option, optIndex) => {
                                const isUserAnswer = result.userAnswer === optIndex;
                                const isCorrectAnswer = result.correctAnswer === optIndex;
                                return (
                                  <div
                                    key={optIndex}
                                    className={`p-2 rounded-lg ${
                                      isCorrectAnswer
                                        ? 'bg-green-100 border border-green-400'
                                        : isUserAnswer
                                        ? 'bg-red-100 border border-red-400'
                                        : 'bg-white border border-gray-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      {isCorrectAnswer && <span className="text-green-600 font-bold">✓ Correct:</span>}
                                      {isUserAnswer && !isCorrectAnswer && <span className="text-red-600 font-bold">✗ Your answer:</span>}
                                      <span className={isCorrectAnswer || isUserAnswer ? 'font-medium' : ''}>
                                        {option}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => setShowResults(false)}
                  >
                    Close
                  </Button>
                  {!quizResults.passed && (
                    <Button
                      onClick={() => {
                        setShowResults(false);
                        setShowQuiz(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Try Again
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Celebration Dialog */}
        {showCelebration && (
          <Dialog open={showCelebration} onOpenChange={setShowCelebration}>
            <DialogContent className="max-w-2xl">
              <div className="text-center space-y-6 py-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", duration: 0.5 }}
                >
                  <div className="text-8xl mb-4">🎉</div>
                </motion.div>
                <h2 className="text-4xl font-bold text-gray-900">
                  Congratulations, {user?.full_name?.split(' ')[0]}!
                </h2>
                <p className="text-xl text-gray-700">
                  You've officially completed your onboarding and joined the Chai Patta family.
                </p>
                <p className="text-lg text-gray-600">
                  You're now ready to deliver excellence and warmth in every cup. 🌟
                </p>
                <div className="flex justify-center gap-4 pt-6">
                  <Button
                    onClick={() => setShowCelebration(false)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Award className="w-4 h-4 mr-2" />
                    View My Certificate
                  </Button>
                  <Link to={createPageUrl("Dashboard")}>
                    <Button variant="outline">
                      Go to Dashboard
                    </Button>
                  </Link>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
