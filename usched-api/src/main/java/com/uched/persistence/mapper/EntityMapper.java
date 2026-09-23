package com.uched.persistence.mapper;

import com.uched.domain.model.Course;
import com.uched.domain.model.Instructor;
import com.uched.domain.model.LabMeeting;
import com.uched.domain.model.LectureMeeting;
import com.uched.domain.model.Meeting;
import com.uched.domain.model.MeetingType;
import com.uched.domain.model.Room;
import com.uched.domain.model.Section;
import com.uched.domain.value.TimeRange;
import com.uched.persistence.entity.CourseEntity;
import com.uched.persistence.entity.MeetingEntity;
import com.uched.persistence.entity.RoomEntity;
import com.uched.persistence.entity.SectionEntity;
import org.springframework.stereotype.Component;

import java.util.Comparator;
import java.util.List;

/** Entity to domain mapping. Domain objects re-validate everything they are given. */
@Component
public class EntityMapper {

    public Section toDomain(SectionEntity e) {
        CourseEntity c = e.getCourse();
        Instructor instructor = e.getInstructor() == null ? null
                : new Instructor(e.getInstructor().getId(), e.getInstructor().getName());
        List<Meeting> meetings = e.getMeetings().stream()
                .sorted(Comparator.comparing(MeetingEntity::getDayOfWeek).thenComparing(MeetingEntity::getStartTime))
                .map(this::toDomain).toList();
        return new Section(e.getId(), c.getCode(), c.getName(), c.getUnits().doubleValue(), e.getSectionCode(),
                instructor, e.getSemester(), e.getAcademicYear(), e.getAvailableSlots(), meetings);
    }

    public Meeting toDomain(MeetingEntity m) {
        RoomEntity r = m.getRoom();
        Room room = r == null ? null : new Room(r.getBuilding().isEmpty() ? null : r.getBuilding(), r.getRoomCode(), r.getCampus());
        TimeRange time = new TimeRange(m.getStartTime(), m.getEndTime());
        return m.getMeetingType() == MeetingType.LAB
                ? new LabMeeting(m.getDayOfWeek(), time, room)
                : new LectureMeeting(m.getDayOfWeek(), time, room);
    }

    public Course toDomain(CourseEntity c, List<Section> sections) {
        return new Course(c.getId(), c.getCode(), c.getName(), c.getDescription(), c.getUnits().doubleValue(),
                c.getDepartment(), c.getPrerequisites(), sections);
    }
}
