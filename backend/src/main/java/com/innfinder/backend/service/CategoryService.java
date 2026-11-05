/*
 * @ (#) CategoryService.java    1.0     11/4/2026
 *
 *Copyright (c) 2026 IUH. All rights reserved
 */

package com.innfinder.backend.service;


import com.innfinder.backend.dto.room.AmenityResponse;
import com.innfinder.backend.dto.room.CategoryResponse;
import com.innfinder.backend.repository.LoaiPhongTroRepository;
import com.innfinder.backend.repository.TienIchRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/*
 * @description:
 * @author: Nha Tran Quoc
 * @version: 1.0
 * @created: 11/4/2026 7:18 PM
 */
@Service
@RequiredArgsConstructor
public class CategoryService {
    private final LoaiPhongTroRepository loaiPhongTroRepository;
    private final TienIchRepository tienIchRepository;

    @Transactional(readOnly = true)
    public List<CategoryResponse> getAllRoomTypes(){
        return loaiPhongTroRepository.findAll()
                .stream()
                .map(CategoryResponse::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AmenityResponse> getAllAmenities() {
        return tienIchRepository.findAll()
                .stream()
                .map(AmenityResponse::fromEntity)
                .toList();
    }

}
