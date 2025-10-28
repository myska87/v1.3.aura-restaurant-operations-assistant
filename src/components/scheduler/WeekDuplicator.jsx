import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, Calendar } from 'lucide-react';
import { format, addWeeks } from 'date-fns';

/**
 * Week Duplicator Component
 * Allows managers to duplicate entire weeks or specific days/departments
 */
export default function WeekDuplicator({ 
  sourceWeekStart, 
  shifts = [], 
  onDuplicate, 
  open, 
  onOpenChange 
}) {
  const [selectedDays, setSelectedDays] = useState({
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: true,
    sunday: true,
  });

  const [selectedDepartments, setSelectedDepartments] = useState({
    kitchen: true,
    front_of_house: true,
    bar: true,
    management: true,
    cleaning: true,
    maintenance: true,
  });

  const [targetWeekOffset, setTargetWeekOffset] = useState(1);

  const handleDuplicate = () => {
    const selectedDaysList = Object.keys(selectedDays).filter(day => selectedDays[day]);
    const selectedDeptsList = Object.keys(selectedDepartments).filter(dept => selectedDepartments[dept]);

    onDuplicate({
      days: selectedDaysList,
      departments: selectedDeptsList,
      weekOffset: targetWeekOffset,
    });
  };

  const shiftsCount = shifts.length;
  const targetWeek = addWeeks(sourceWeekStart, targetWeekOffset);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Copy className="w-6 h-6 text-purple-600" />
            Duplicate Week Schedule
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Source/Target Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600 mb-1">Source Week</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="font-semibold">{format(sourceWeekStart, 'MMM d, yyyy')}</p>
              </div>
              <Badge className="mt-2">{shiftsCount} shifts</Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Target Week</p>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <p className="font-semibold">{format(targetWeek, 'MMM d, yyyy')}</p>
              </div>
              <select
                value={targetWeekOffset}
                onChange={(e) => setTargetWeekOffset(parseInt(e.target.value))}
                className="mt-2 border rounded px-2 py-1 text-sm"
              >
                <option value={1}>Next week</option>
                <option value={2}>2 weeks ahead</option>
                <option value={3}>3 weeks ahead</option>
                <option value={4}>4 weeks ahead</option>
              </select>
            </div>
          </div>

          {/* Day Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Days to Copy</Label>
            <div className="grid grid-cols-4 gap-3">
              {Object.keys(selectedDays).map(day => (
                <div key={day} className="flex items-center gap-2">
                  <Checkbox
                    id={`day-${day}`}
                    checked={selectedDays[day]}
                    onCheckedChange={(checked) => 
                      setSelectedDays({ ...selectedDays, [day]: checked })
                    }
                  />
                  <Label htmlFor={`day-${day}`} className="text-sm capitalize cursor-pointer">
                    {day}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Department Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Select Departments to Copy</Label>
            <div className="grid grid-cols-2 gap-3">
              {Object.keys(selectedDepartments).map(dept => (
                <div key={dept} className="flex items-center gap-2">
                  <Checkbox
                    id={`dept-${dept}`}
                    checked={selectedDepartments[dept]}
                    onCheckedChange={(checked) =>
                      setSelectedDepartments({ ...selectedDepartments, [dept]: checked })
                    }
                  />
                  <Label htmlFor={`dept-${dept}`} className="text-sm capitalize cursor-pointer">
                    {dept.replace('_', ' ')}
                  </Label>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleDuplicate} className="bg-purple-600 hover:bg-purple-700">
            <Copy className="w-4 h-4 mr-2" />
            Duplicate {shiftsCount} Shifts
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}