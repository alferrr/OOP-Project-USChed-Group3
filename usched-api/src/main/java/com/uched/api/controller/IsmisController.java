package com.uched.api.controller;

import com.uched.api.dto.IsmisDtos.CourseRefDto;
import com.uched.api.dto.IsmisDtos.IsmisLoginRequest;
import com.uched.api.dto.IsmisDtos.IsmisSessionResponse;
import com.uched.api.dto.IsmisDtos.ProspectusCourseDto;
import com.uched.api.dto.IsmisDtos.ProspectusResponse;
import com.uched.api.dto.IsmisDtos.SearchError;
import com.uched.api.dto.IsmisDtos.SearchItemDto;
import com.uched.api.dto.IsmisDtos.SearchRequest;
import com.uched.api.dto.IsmisDtos.SearchStartResponse;
import com.uched.api.dto.IsmisDtos.SearchStatusResponse;
import com.uched.api.filter.StudentCatalogFilter;
import com.uched.domain.value.Semester;
import com.uched.service.IsmisSessionService;
import com.uched.service.SearchJobService;
import com.uched.service.UChedProperties;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Everything here sits behind ConsentEnforcementFilter. Bodies are never logged. The ISMIS session id (an
 * unguessable random value the browser holds) is proof enough of who is asking for everything past sign-in;
 * it does not need to be re-verified against anything else.
 */
@RestController
@RequestMapping("/api/ismis")
public class IsmisController {
    public static final String SESSION_HEADER = StudentCatalogFilter.SESSION_HEADER;

    private final IsmisSessionService sessions;
    private final SearchJobService searches;
    private final UChedProperties props;

    public IsmisController(IsmisSessionService sessions, SearchJobService searches, UChedProperties props) {
        this.sessions = sessions;
        this.searches = searches;
        this.props = props;
    }

    /**
     * Signs in to ISMIS once, using the student's own ISMIS username as their ID number. The password is
     * destroyed before this returns; only a session id comes back.
     */
    @PostMapping("/session")
    public IsmisSessionResponse signIn(@Valid @RequestBody IsmisLoginRequest req) {
        var opened = sessions.login(req.username(), req.password().toCharArray());
        return new IsmisSessionResponse(opened.sessionId(), opened.expiresAt(), props.getIsmisSession().getIdleMinutes());
    }

    @DeleteMapping("/session")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void signOut(@RequestHeader(value = SESSION_HEADER, required = false) String sessionId) {
        sessions.logout(sessionId);
    }

    @PostMapping("/searches")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public SearchStartResponse start(@RequestHeader(value = SESSION_HEADER, required = false) String sessionId,
                                     @Valid @RequestBody SearchRequest req) {
        String jobId = searches.submit(sessionId, Semester.fromCode(req.semester()), req.academicYear(), req.queries());
        return new SearchStartResponse(jobId);
    }

    /**
     * The student's own degree-program curriculum (not what is offered this term): fetched live over their
     * ISMIS session, once, then cached for the rest of the session.
     */
    @GetMapping("/prospectus")
    public ProspectusResponse prospectus(@RequestHeader(value = SESSION_HEADER, required = false) String sessionId) {
        try (IsmisSessionService.Lease lease = sessions.lease(sessionId)) {
            var p = lease.connection().prospectus();
            var courses = p.courses().stream()
                    .map(c -> new ProspectusCourseDto(c.yearLevel(), c.semester().code(), c.code(), c.title(),
                            c.units(), c.requisiteNote()))
                    .toList();
            return new ProspectusResponse(p.programName(), p.effectiveYear(), courses);
        }
    }

    @GetMapping("/searches/{jobId}")
    public SearchStatusResponse status(@PathVariable String jobId) {
        var v = searches.view(jobId);
        var items = v.items().stream().map(i -> new SearchItemDto(i.query(), i.status().name(), i.message(),
                i.courses(), i.sections(),
                i.found().stream().map(c -> new CourseRefDto(c.id(), c.code(), c.name(), c.units())).toList(),
                i.suggestions().stream().map(c -> new CourseRefDto(c.id(), c.code(), c.name(), c.units())).toList(),
                i.searchedAs())).toList();
        SearchError error = v.errorCode() == null ? null : new SearchError(v.errorCode(), v.errorMessage());
        return new SearchStatusResponse(v.jobId(), v.status().name(), v.message(), items, error);
    }
}
