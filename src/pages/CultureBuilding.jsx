
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
}
 from "@/components/ui/dialog";
import { Heart, Plus, Video, CheckCircle, Trophy, ArrowLeft, Home } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";

export default function CultureBuilding() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingContent, setEditingContent] = useState(null);
  const [showQuiz, setShowQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState(null);

  const [formData, setFormData] = useState({
    content_type: "company_value",
    title: "",
    content: "",
    media_url: "",
    order_sequence: 1,
    requires_acknowledgement: false,
    quiz_questions: [],
  });

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: cultureContent = [] } = useQuery({
    queryKey: ['cultureContent'],
    queryFn: () => base44.entities.CultureContent.list('order_sequence'),
  });

  const { data: acknowledgements = [] } = useQuery({
    queryKey: ['cultureAcknowledgements', user?.email],
    queryFn: () => base44.entities.CultureAcknowledgement.filter({ staff_email: user?.email }),
    enabled: !!user?.email,
  });

  const createContentMutation = useMutation({
    mutationFn: (data) => base44.entities.CultureContent.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultureContent'] });
      resetForm();
    },
  });

  const createAcknowledgementMutation = useMutation({
    mutationFn: (data) => base44.entities.CultureAcknowledgement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cultureAcknowledgements'] });
    },
  });

  const createChatMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.ChatMessage.create(data),
  });

  const resetForm = () => {
    setShowForm(false);
    setEditingContent(null);
    setFormData({
      content_type: "company_value",
      title: "",
      content: "",
      media_url: "",
      order_sequence: 1,
      requires_acknowledgement: false,
      quiz_questions: [],
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createContentMutation.mutateAsync({
      ...formData,
      created_by: user?.email,
      effective_date: new Date().toISOString().split('T')[0],
      is_active: true,
    });
  };

  const handleAcknowledge = async (content) => {
    await createAcknowledgementMutation.mutateAsync({
      staff_email: user?.email,
      staff_name: user?.full_name,
      culture_content_id: content.id,
      content_title: content.title,
      acknowledged_at: new Date().toISOString(),
      quiz_taken: false,
      quiz_passed: false,
    });

    alert(`✅ Thank you for acknowledging: ${content.title}`);
  };

  const postBadgeToChat = async (staffName, badgeName, points) => {
    try {
      // Find "All Staff" chat room
      const chatRooms = await base44.entities.ChatRoom.list();
      const allStaffRoom = chatRooms.find(room => room.room_name === "All Staff");
      
      if (!allStaffRoom) return;

      const messageContent = `🏆 ${staffName} earned the "${badgeName}" badge for completing a culture quiz! +${points} points! 🎉`;

      await createChatMessageMutation.mutateAsync({
        room_id: allStaffRoom.id,
        room_name: allStaffRoom.room_name,
        sender_email: "system",
        sender_name: "AURA System",
        message_content: messageContent,
        message_type: "announcement",
        attachments: [],
        read_by: [],
      });
    } catch (error) {
      console.error("Error posting badge to chat:", error);
    }
  };

  const handleQuizSubmit = async (content) => {
    const questions = content.quiz_questions || [];
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

    const score = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 100; // Handle division by zero for no questions
    const passed = score >= 80;

    // Store results for display
    setQuizResults({
      score,
      passed,
      correctCount,
      totalQuestions: questions.length,
      results: results,
      contentTitle: content.title,
    });

    // Save to database
    await createAcknowledgementMutation.mutateAsync({
      staff_email: user?.email,
      staff_name: user?.full_name,
      culture_content_id: content.id,
      content_title: content.title,
      acknowledged_at: new Date().toISOString(),
      quiz_taken: true,
      quiz_score: score,
      quiz_passed: passed,
    });

    // If passed, post to chat
    if (passed) {
      await postBadgeToChat(user?.full_name, `${content.title} Champion`, 5);
    }

    // Close quiz, show results
    setShowQuiz(null);
    setShowResults(true);
    setQuizAnswers({});
  };

  const closeResults = () => {
    setShowResults(false);
    setQuizResults(null);
  };

  const isAcknowledged = (contentId) => {
    return acknowledgements.some(ack => ack.culture_content_id === contentId);
  };

  const complianceRate = cultureContent.length > 0
    ? Math.round((acknowledgements.length / cultureContent.filter(c => c.requires_acknowledgement).length) * 100)
    : 0;

  const dailyQuote = cultureContent.find(c => c.content_type === 'daily_quote');
  const ravingFans = cultureContent.find(c => c.content_type === 'philosophy');
  const companyValues = cultureContent.filter(c => c.content_type === 'company_value');

  return (
    <div className="p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Back Buttons */}
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

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
              <Heart className="w-8 h-8 text-orange-600" />
              Culture Building
            </h1>
            <p className="text-gray-600">Our values, mission, and what makes us special</p>
          </div>
          {user?.role === 'admin' && (
            <Button onClick={() => setShowForm(true)} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Culture Content
            </Button>
          )}
        </div>

        {/* Compliance Rate */}
        <Card className="bg-gradient-to-r from-green-500 to-green-600 text-white border-none shadow-lg mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-bold mb-2">Your Culture Compliance</h3>
                <p className="text-green-100">Keep learning and acknowledging our values!</p>
              </div>
              <div className="text-center">
                <div className="text-5xl font-bold">{complianceRate}%</div>
                <p className="text-sm text-green-100 mt-1">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Quote */}
        {dailyQuote && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="bg-blue-50 border-blue-200 mb-8">
              <CardContent className="p-6 text-center">
                <p className="text-sm text-blue-600 font-semibold mb-2">💡 DAILY INSPIRATION</p>
                <p className="text-2xl font-bold text-gray-900 italic">"{dailyQuote.content}"</p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Raving Fans Philosophy */}
        {ravingFans && (
          <Card className="bg-gradient-to-r from-purple-600 to-pink-600 text-white border-none shadow-xl mb-8">
            <CardContent className="p-8 text-center">
              <h2 className="text-3xl font-bold mb-4">🌟 {ravingFans.title} 🌟</h2>
              <p className="text-xl leading-relaxed">{ravingFans.content}</p>
              {ravingFans.media_url && (
                <div className="mt-6">
                  <video src={ravingFans.media_url} controls className="w-full max-w-2xl mx-auto rounded-lg" />
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Company Values */}
        {companyValues.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {companyValues.map(value => (
                <Card key={value.id} className="bg-white border-none shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{value.title}</span>
                      {isAcknowledged(value.id) && (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-4">{value.content}</p>
                    {value.media_url && (
                      <video src={value.media_url} controls className="w-full rounded-lg mb-4" />
                    )}
                    {value.requires_acknowledgement && !isAcknowledged(value.id) && (
                      <Button
                        onClick={() => handleAcknowledge(value)}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        I've Read and Agree
                      </Button>
                    )}
                    {value.quiz_questions && value.quiz_questions.length > 0 && (
                      <Button
                        onClick={() => setShowQuiz(value)}
                        className="w-full mt-2 bg-blue-600 hover:bg-blue-700"
                      >
                        Take Culture Quiz
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* All Culture Content */}
        <div className="space-y-6">
          {cultureContent.filter(c => c.content_type !== 'company_value' && c.content_type !== 'daily_quote' && c.content_type !== 'philosophy').map(content => (
            <Card key={content.id} className="bg-white border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{content.title}</span>
                  <Badge variant="outline">{content.content_type.replace(/_/g, ' ')}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{content.content}</p>
                {content.media_url && (
                  <div className="mt-4">
                    {content.media_url.includes('video') || content.content_type === 'video_message' ? (
                      <video src={content.media_url} controls className="w-full rounded-lg" />
                    ) : (
                      <img src={content.media_url} alt={content.title} className="w-full rounded-lg" />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Admin Form Dialog */}
        {user?.role === 'admin' && (
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Culture Content</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div>
                  <Label>Content Type</Label>
                  <Select
                    value={formData.content_type}
                    onValueChange={(value) => setFormData({ ...formData, content_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="company_value">Company Value</SelectItem>
                      <SelectItem value="mission">Mission</SelectItem>
                      <SelectItem value="code_of_conduct">Code of Conduct</SelectItem>
                      <SelectItem value="daily_quote">Daily Quote</SelectItem>
                      <SelectItem value="philosophy">Philosophy</SelectItem>
                      <SelectItem value="video_message">Video Message</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label>Content</Label>
                  <Textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={5}
                    required
                  />
                </div>

                <div>
                  <Label>Media URL (Optional)</Label>
                  <Input
                    value={formData.media_url}
                    onChange={(e) => setFormData({ ...formData, media_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_acknowledgement}
                    onChange={(e) => setFormData({ ...formData, requires_acknowledgement: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <Label>Requires staff acknowledgement</Label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button type="submit" className="bg-orange-600 hover:bg-orange-700">
                    Create Content
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}

        {/* Quiz Dialog */}
        {showQuiz && (
          <Dialog open={!!showQuiz} onOpenChange={() => setShowQuiz(null)}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Culture Quiz: {showQuiz.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-blue-800">
                    📝 Answer all questions to complete the quiz. You need 80% or higher to pass.
                  </p>
                </div>

                {showQuiz.quiz_questions?.map((q, index) => (
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
                    setShowQuiz(null);
                    setQuizAnswers({});
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => handleQuizSubmit(showQuiz)} 
                    className="bg-green-600 hover:bg-green-700"
                    disabled={Object.keys(quizAnswers).length !== showQuiz.quiz_questions?.length}
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
                {/* Score Summary */}
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
                        ? '✅ You passed! Great job understanding our culture!' 
                        : '⚠️ You need 80% to pass. Review the content and try again.'}
                    </p>
                  </CardContent>
                </Card>

                {/* Detailed Results */}
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

                {/* Action Buttons */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={closeResults}
                  >
                    Close
                  </Button>
                  {!quizResults.passed && (
                    <Button 
                      onClick={() => {
                        closeResults();
                        // Reopen quiz to try again
                        const contentToRetest = cultureContent.find(c => c.title === quizResults.contentTitle);
                        if (contentToRetest) {
                          setShowQuiz(contentToRetest);
                        }
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
      </div>
    </div>
  );
}
