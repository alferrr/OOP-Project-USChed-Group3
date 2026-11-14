package com.uched.service;

import com.uched.datasource.CourseDataSource;
import com.uched.domain.model.Course;
import com.uched.domain.model.Meeting;
import com.uched.domain.model.Room;
import com.uched.domain.model.Section;
import com.uched.domain.value.Semester;
import com.uched.persistence.entity.CatalogSnapshotEntity;
import com.uched.persistence.entity.CourseEntity;
import com.uched.persistence.entity.InstructorEntity;
import com.uched.persistence.entity.MeetingEntity;
import com.uched.persistence.entity.RoomEntity;
import com.uched.persistence.entity.SectionEntity;
import com.uched.persistence.repository.CatalogSnapshotRepository;
import com.uched.persistence.repository.CourseRepository;
import com.uched.persistence.repository.InstructorRepository;
import com.uched.persistence.repository.RoomRepository;
import com.uched.persistence.repository.SectionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/** Depends only on CourseDataSource: it cannot tell ISMIS from a CSV or a mock. Upserts by natural keys. */
@Service
public class CourseImportService {
    private final CourseRepository courses;
    private final SectionRepository sections;
    private final InstructorRepository instructors;
    private final RoomRepository rooms;
    private final CatalogSnapshotRepository snapshots;

    public CourseImportService(CourseRepository courses, SectionRepository sections, InstructorRepository instructors,
                               RoomRepository rooms, CatalogSnapshotRepository snapshots) {
        this.courses = courses;
        this.sections = sections;
        this.instructors = instructors;
        this.rooms = rooms;
        this.snapshots = snapshots;
    }

    @Transactional
    public ImportReport importFrom(CourseDataSource source, Semester semester, String academicYear, String studentIdNumber) {
        List<Course> fetched = source.fetchCourses(semester, academicYear);
        List<String> errors = new ArrayList<>(source.skippedRecords());
        int courseCount = 0;
        int sectionCount = 0;
        for (Course c : fetched) {
            CourseEntity ce = upsertCourse(c, source.providesUnits(), studentIdNumber);
            courseCount++;
            for (Section s : c.getSections()) {
                upsertSection(ce, s, studentIdNumber);
                sectionCount++;
            }
        }
        CatalogSnapshotEntity snap = new CatalogSnapshotEntity();
        snap.setStudentIdNumber(studentIdNumber);
        snap.setSource(source.type());
        snap.setSemester(semester);
        snap.setAcademicYear(academicYear);
        snap.setCourseCount(courseCount);
        snap.setSectionCount(sectionCount);
        snap.setSkippedCount(errors.size());
        snap.setScrapedAt(Instant.now());
        snapshots.save(snap);
        return new ImportReport(courseCount, sectionCount, errors.size(), List.copyOf(errors));
    }

    private CourseEntity upsertCourse(Course c, boolean sourceHasUnits, String studentIdNumber) {
        CourseEntity e = courses.findByStudentIdNumberAndCode(studentIdNumber, c.getCode()).orElseGet(CourseEntity::new);
        e.setStudentIdNumber(studentIdNumber);
        e.setCode(c.getCode());
        e.setName(c.getName());
        if (sourceHasUnits || e.getUnits() == null) {
            e.setUnits(BigDecimal.valueOf(c.getUnits()));
        }
        if (c.getDepartment() != null) {
            e.setDepartment(c.getDepartment());
        }
        if (c.getPrerequisites() != null) {
            e.setPrerequisites(c.getPrerequisites());
        }
        if (c.getDescription() != null) {
            e.setDescription(c.getDescription());
        }
        return courses.save(e);
    }

    private void upsertSection(CourseEntity course, Section s, String studentIdNumber) {
        SectionEntity e = sections.findByCourseIdAndSectionCodeAndSemesterAndAcademicYear(
                course.getId(), s.getSectionCode(), s.getSemester(), s.getAcademicYear())
                .orElseGet(SectionEntity::new);
        e.setStudentIdNumber(studentIdNumber);
        e.setCourse(course);
        e.setSectionCode(s.getSectionCode());
        e.setSemester(s.getSemester());
        e.setAcademicYear(s.getAcademicYear());
        e.setAvailableSlots(s.getAvailableSlots().orElse(null));
        e.setInstructor(s.getInstructor().map(i -> instructor(i.getName())).orElse(null));
        e.getMeetings().clear();
        for (Meeting m : s.getMeetings()) {
            MeetingEntity me = new MeetingEntity();
            me.setSection(e);
            me.setMeetingType(m.getType());
            me.setDayOfWeek(m.getDay());
            me.setStartTime(m.getTime().start());
            me.setEndTime(m.getTime().end());
            me.setRoom(m.getRoom().map(this::room).orElse(null));
            e.getMeetings().add(me);
        }
        sections.save(e);
    }

    private InstructorEntity instructor(String name) {
        return instructors.findByName(name).orElseGet(() -> {
            InstructorEntity i = new InstructorEntity();
            i.setName(name);
            return instructors.save(i);
        });
    }

    private RoomEntity room(Room r) {
        String building = r.building() == null ? "" : r.building();
        String campus = r.campus() == null ? "Main" : r.campus();
        return rooms.findByCampusAndBuildingAndRoomCode(campus, building, r.roomCode()).orElseGet(() -> {
            RoomEntity e = new RoomEntity();
            e.setBuilding(building);
            e.setRoomCode(r.roomCode());
            e.setCampus(campus);
            return rooms.save(e);
        });
    }
}
